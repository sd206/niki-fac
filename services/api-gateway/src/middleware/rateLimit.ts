import type { NextFunction, Request, Response } from "express";

interface RateBucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, RateBucket>();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = Number(process.env.RATE_LIMIT_RPM ?? 120);

function getClientId(req: Request): string {
  const user = (req as Express.Request).user;
  if (user?.uid) return `uid:${user.uid}`;
  const fwd = req.header("x-forwarded-for");
  if (fwd) return `ip:${fwd.split(",")[0]!.trim()}`;
  return `ip:${req.ip ?? "unknown"}`;
}

/**
 * Simple in-memory fixed-window rate limiter (per user or IP).
 * In production, replace with a Redis-backed limiter.
 */
export function rateLimit(req: Request, res: Response, next: NextFunction): void {
  const clientId = getClientId(req);
  const now = Date.now();
  const bucket = buckets.get(clientId);

  if (!bucket || now > bucket.resetAt) {
    buckets.set(clientId, { count: 1, resetAt: now + WINDOW_MS });
    next();
    return;
  }

  bucket.count++;
  if (bucket.count > MAX_REQUESTS) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({
      error: {
        code: "rate_limited",
        message: `Rate limit exceeded. Max ${MAX_REQUESTS} requests per minute.`,
      },
    });
    return;
  }

  next();
}

// Periodic cleanup of expired buckets (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (now > bucket.resetAt) buckets.delete(key);
  }
}, 300_000).unref();
