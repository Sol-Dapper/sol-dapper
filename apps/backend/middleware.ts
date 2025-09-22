import type { NextFunction, Request, Response } from "express"
import { createRemoteJWKSet, jwtVerify } from "jose"

const JWKS = createRemoteJWKSet(new URL(process.env.PRIVY_JWKS_URL!))

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // Set CORS headers for ALL responses from this middleware
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept, Origin, X-Requested-With");

  // Skip authentication for OPTIONS requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = req.headers.authorization
  if (!authHeader) {
    // CORS headers are already set above
    res.status(401).json({ error: "Authorization header missing" })
    return
  }

  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader

  try {
    const { payload } = await jwtVerify(token, JWKS, {
      audience: process.env.NEXT_PUBLIC_PRIVY_APP_ID,
      issuer: "privy.io",
    })

    if (!payload.sub) {
      // CORS headers are already set above
      res.status(401).json({ error: "No user ID found in token" })
      return
    }

    req.privyUserId = payload.sub as string
    next()
  } catch (error) {
    console.error("Token verification error:", error)
    // CORS headers are already set above
    res.status(401).json({ error: "Invalid or expired token" })
  }
}