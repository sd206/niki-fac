import type { NextFunction, Request, Response } from "express";

export interface CallerContext {
  uid: string;
  email: string | null;
  displayName: string | null;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      caller?: CallerContext;
    }
  }
}

/**
 * Trusts identity headers set by the API gateway (JWT verified at the edge).
 * This service must never be exposed publicly.
 */
export function withCaller(req: Request, res: Response, next: NextFunction): void {
  const uid = req.header("x-user-id");
  if (!uid) {
    res.status(401).json({ error: { code: "unauthenticated", message: "Missing x-user-id" } });
    return;
  }
  req.caller = {
    uid,
    email: req.header("x-user-email") || null,
    displayName: req.header("x-user-name") || null,
  };
  next();
}
