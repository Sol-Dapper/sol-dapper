import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    res.status(401).json({ error: "Authorization header missing" });
    return;
  }

  // Extract token from "Bearer TOKEN" format if present, otherwise use as-is
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.substring(7) 
    : authHeader;

  try {
    const decoded = jwt.decode(token) as any;
    
    if (!decoded) {
      res.status(401).json({ error: "Invalid token format" });
      return;
    }

    const privyUserId = decoded.sub;

    if (!privyUserId) {
      res.status(401).json({ error: "No user ID found in token" });
      return;
    }

    req.privyUserId = privyUserId;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(401).json({ error: "Invalid token" });
    return;
  }
}
