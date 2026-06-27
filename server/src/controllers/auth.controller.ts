import { Request, Response } from "express";
import bcrypt from "bcrypt";
import crypto from "crypto";
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
const REFRESH_DAYS = 7;

const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// Frontend and backend are on different domains in production (Vercel + Render),
// so the cookie must be SameSite=None there; browsers reject None without Secure.
// In dev, Vite proxies /api same-origin, so Lax is fine and works over plain HTTP.
const isProduction = process.env["NODE_ENV"] === "production";
const COOKIE_OPTS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
  path: "/",
  maxAge: REFRESH_DAYS * 24 * 60 * 60 * 1000,
};
const CLEAR_COOKIE_OPTS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: (isProduction ? "none" : "lax") as "none" | "lax",
  path: "/",
};

function signAccessToken(userId: string): string {
  return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: "15m" });
}

async function issueTokens(userId: string, res: Response): Promise<string> {
  const token = crypto.randomBytes(64).toString("hex");
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000);

  await prisma.refreshToken.create({
    data: { token, user_id: userId, expires_at: expiresAt },
  });

  res.cookie("refresh_token", token, COOKIE_OPTS);
  return signAccessToken(userId);
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

    const token = await issueTokens(user.id, res);
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

    if (!user.password) {
      res.status(401).json({
        message: "This account uses Google Sign-In. Please use the Google button to log in.",
      });
      return;
    }

    const hashedPassword: string = user.password;
    const passwordMatch = await bcrypt.compare(password, hashedPassword);
    if (!passwordMatch) {
      res.status(401).json({ message: "Invalid email or password" });
      return;
    }

    const token = await issueTokens(user.id, res);
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

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID.trim(),
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email || !payload.sub) {
      res.status(400).json({ message: "Invalid Google token" });
      return;
    }

    const { sub: googleId, email, name = "Google User" } = payload;

    let user =
      (await findUserByGoogleId(googleId)) ?? (await findUserByEmail(email));

    if (user) {
      if (!user.google_id) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { google_id: googleId },
        });
      }
    } else {
      user = await createUser({ name, email, google_id: googleId });
    }

    const token = await issueTokens(user.id, res);
    res.status(200).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Google auth error:", error instanceof Error ? error.message : error);
    res.status(401).json({ message: "Google authentication failed. Please try again." });
  }
};

export const refresh = async (req: Request, res: Response): Promise<void> => {
  try {
    const incoming = req.cookies?.refresh_token as string | undefined;

    if (!incoming) {
      res.status(401).json({ message: "No refresh token" });
      return;
    }

    const stored = await prisma.refreshToken.findUnique({
      where: { token: incoming },
    });

    if (!stored || stored.expires_at < new Date()) {
      // Clean up expired token if it exists
      if (stored) await prisma.refreshToken.delete({ where: { id: stored.id } });
      res.clearCookie("refresh_token", CLEAR_COOKIE_OPTS);
      res.status(401).json({ message: "Refresh token invalid or expired" });
      return;
    }

    // Rotate: delete old token, issue fresh pair
    await prisma.refreshToken.delete({ where: { id: stored.id } });

    const accessToken = await issueTokens(stored.user_id, res);
    res.json({ token: accessToken });
  } catch (error) {
    console.error("Refresh error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    const incoming = req.cookies?.refresh_token as string | undefined;

    if (incoming) {
      await prisma.refreshToken.deleteMany({ where: { token: incoming } });
    }

    res.clearCookie("refresh_token", CLEAR_COOKIE_OPTS);
    res.status(204).send();
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
