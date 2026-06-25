import type { AuthenticatedUser } from "@niki/shared-types";
import type { NextFunction, Request, Response } from "express";
import { firebaseAuth } from "../firebase.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Verifies the Firebase ID token from the Authorization: Bearer header and
 * attaches the authenticated user to the request.
 */
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.header("authorization");
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: { code: "unauthenticated", message: "Missing bearer token" } });
    return;
  }

  const idToken = header.slice("Bearer ".length).trim();
  try {
    const decoded = await firebaseAuth().verifyIdToken(idToken);
    req.user = {
      uid: decoded.uid,
      email: decoded.email ?? null,
      displayName: decoded.name ?? null,
      photoUrl: decoded.picture ?? null,
    };
    next();
  } catch {
    res.status(401).json({ error: { code: "invalid_token", message: "Invalid or expired token" } });
  }
}
