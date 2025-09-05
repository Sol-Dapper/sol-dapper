import type { NextFunction, Request, Response } from "express"
import { createRemoteJWKSet, jwtVerify } from "jose"

// Use the JWKS link from your Privy dashboard
const JWKS = createRemoteJWKSet(new URL(process.env.PRIVY_JWKS_URL!))

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization
  if (!authHeader) {
    res.status(401).json({ error: "Authorization header missing" })
    return
  }

  const token = authHeader.startsWith("Bearer ") ? authHeader.substring(7) : authHeader

  try {
    // Verify token using JWKS
    const { payload } = await jwtVerify(token, JWKS, {
      audience: process.env.NEXT_PUBLIC_PRIVY_APP_ID, // Must match your app id
      issuer: "privy.io", // Or the exact issuer your JWKS specifies
    })

    if (!payload.sub) {
      res.status(401).json({ error: "No user ID found in token" })
      return
    }

    req.privyUserId = payload.sub as string
    next()
  } catch (error) {
    console.error("Token verification error:", error)
    res.status(401).json({ error: "Invalid or expired token" })
  }
}
