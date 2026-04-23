import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env["JWT_SECRET"] as string;

export const protect = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const authHeader = req.headers["authorization"];

  //If token is missing, blocks it
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ message: "No token provided" });
    return;
  }

  const token = authHeader.split(" ")[1] as string;

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };
    // cast to any to attach user id — picked up by controllers downstream
    (req as any).user = { id: decoded.id };
    next();
  } catch {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};
