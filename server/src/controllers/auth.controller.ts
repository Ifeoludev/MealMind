import { Request, Response } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import prisma from "../config/db";
import {
  createUser,
  findUserByEmail,
  findUserByGoogleId,
} from "../repositories/user.repository";

const JWT_SECRET = process.env["JWT_SECRET"] as string;
const GOOGLE_CLIENT_ID = process.env["GOOGLE_CLIENT_ID"] as string;
const SALT_ROUNDS = 10;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

function signToken(userId: string): string {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "7d" });
}

export const register = async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body as {
      name: string;
      email: string;
      password: string;
    };

    if (!name || !email || !password) {
      res.status(400).json({ message: "Name, email and password are required" });
      return;
    }

    if (password.length < 8) {
      res.status(400).json({ message: "Password must be at least 8 characters" });
      return;
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      res.status(409).json({ message: "Email already in use" });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await createUser({ name, email, password: hashedPassword });

    const token = signToken(user.id);
    res.status(201).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      res.status(400).json({ message: "Email and password are required" });
      return;
    }

    const user = await findUserByEmail(email);
    if (!user) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    // Google-only account — has no password set
    if (!user.password) {
      res.status(401).json({
        message: "This account uses Google Sign-In. Please use the Google button to log in.",
      });
      return;
    }

    // At this point TypeScript still sees user.password as string | null,
    // so we extract it into a local const to get a narrowed string type
    const hashedPassword: string = user.password;
    const passwordMatch = await bcrypt.compare(password, hashedPassword);
    if (!passwordMatch) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const token = signToken(user.id);
    res.status(200).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const googleAuth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { credential } = req.body as { credential: string };

    if (!credential) {
      res.status(400).json({ message: "Google credential is required" });
      return;
    }

    // Verify the token signature without audience check first
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.sub) {
      res.status(400).json({ message: "Invalid Google token" });
      return;
    }

    // Manual audience check with clear error so we can debug mismatches
    if (payload.aud !== GOOGLE_CLIENT_ID) {
      console.error(`Audience mismatch — token aud: ${payload.aud} | env GOOGLE_CLIENT_ID: ${GOOGLE_CLIENT_ID}`);
      res.status(401).json({
        message: `Audience mismatch. Token: ${payload.aud} | Server expects: ${GOOGLE_CLIENT_ID}`,
      });
      return;
    }

    const { sub: googleId, email, name = "Google User" } = payload;

    // Try to find existing user by Google ID first, then by email
    let user =
      (await findUserByGoogleId(googleId)) ?? (await findUserByEmail(email));

    if (user) {
      // Existing email/password user signing in with Google for the first time —
      // attach their google_id so future logins skip the email lookup
      if (!user.google_id) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { google_id: googleId },
        });
      }
    } else {
      // Brand new user — create account with no password
      user = await createUser({ name, email, google_id: googleId });
    }

    const token = signToken(user.id);
    res.status(200).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    console.error("Google auth error:", detail);
    res.status(401).json({ message: `Google authentication failed: ${detail}` });
  }
};
