import type { WhoAmIResponse } from "@niki/shared-types";
import cors from "cors";
import express from "express";
import { pinoHttp } from "pino-http";
import { requireAuth } from "./middleware/auth.js";
import { rateLimit } from "./middleware/rateLimit.js";

const app = express();
app.use(cors());
app.use(pinoHttp());
app.use(express.json());
app.use(rateLimit);

const PORT = Number(process.env.PORT ?? 8080);
const FAMILY_SERVICE_URL = process.env.FAMILY_SERVICE_URL ?? "http://localhost:8081";
const CALENDAR_SERVICE_URL = process.env.CALENDAR_SERVICE_URL ?? "http://localhost:8082";
const TASKS_SERVICE_URL = process.env.TASKS_SERVICE_URL ?? "http://localhost:8083";
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL ?? "http://localhost:8084";
const FINANCE_SERVICE_URL = process.env.FINANCE_SERVICE_URL ?? "http://localhost:8085";
const DOCUMENT_SERVICE_URL = process.env.DOCUMENT_SERVICE_URL ?? "http://localhost:8086";
const MEAL_SERVICE_URL = process.env.MEAL_SERVICE_URL ?? "http://localhost:8087";
const TRAVEL_SERVICE_URL = process.env.TRAVEL_SERVICE_URL ?? "http://localhost:8088";
const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? "http://localhost:8089";
const KG_SERVICE_URL = process.env.KG_SERVICE_URL ?? "http://localhost:8090";
const ANALYTICS_SERVICE_URL = process.env.ANALYTICS_SERVICE_URL ?? "http://localhost:8091";

/**
 * Wraps an async Express middleware so unhandled rejections are passed to
 * next() instead of silently hanging the request (Express 4 limitation).
 */
function asyncHandler(
  fn: (req: express.Request, res: express.Response, next: express.NextFunction) => Promise<void>,
) {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Fetch-based proxy: receives an authenticated request, forwards it to the
 * backend service via fetch(), and streams the response back.
 */
function fetchProxy(target: string, prefix: string, downstream: string) {
  console.log(`[proxy] ${prefix} -> ${target}${downstream}`);
  return asyncHandler(async (req, res) => {
    const user = req.user;
    const rewrittenPath = req.originalUrl.replace(new RegExp(`^${prefix}`), downstream);
    const url = `${target}${rewrittenPath}`;

    // Build headers - only set non-empty values, no Content-Type on GET
    const headers: Record<string, string> = {};
    if (user) {
      headers["x-user-id"] = user.uid;
      if (user.email) headers["x-user-email"] = user.email;
      if (user.displayName) headers["x-user-name"] = user.displayName;
    }

    const fetchOptions: RequestInit = { method: req.method, headers };
    if (req.method !== "GET" && req.method !== "HEAD") {
      headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify(req.body);
    }

    try {
      console.log(`[proxy] ${req.method} ${url}`);
      const resp = await fetch(url, { ...fetchOptions, signal: AbortSignal.timeout(60000) });
      const contentType = resp.headers.get("content-type") ?? "application/json";
      const body = await resp.text();
      console.log(`[proxy] ${resp.status} ${url} -> ${body.substring(0, 120)}`);
      res.status(resp.status).type(contentType);
      res.send(body);
    } catch (err: any) {
      console.error(`[proxy error] ${prefix}:`, err.message);
      res.status(502).json({ error: { code: "proxy_error", message: err.message, url } });
    }
  });
}

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok", service: "api-gateway" });
});

app.get("/debug/proxy-test", async (_req, res) => {
  const results: Record<string, string> = {};
  const tests: Array<[string, string, Record<string, string>]> = [
    ["FAMILY/healthz", `${FAMILY_SERVICE_URL}/healthz`, {}],
    ["FAMILY/families-no-headers", `${FAMILY_SERVICE_URL}/families`, {}],
    ["FAMILY/families-with-uid", `${FAMILY_SERVICE_URL}/families`, { "x-user-id": "test-proxy-debug" }],
    ["FAMILY/families-ct-json", `${FAMILY_SERVICE_URL}/families`, { "Content-Type": "application/json" }],
  ];
  for (const [name, url, hdrs] of tests) {
    try {
      const resp = await fetch(url, { headers: hdrs, signal: AbortSignal.timeout(10000) });
      const body = await resp.text();
      results[name] = `HTTP ${resp.status}: ${body.substring(0, 100)}`;
    } catch (err: any) {
      results[name] = `ERROR: ${err.message}`;
    }
  }
  res.json({ results });
});

app.get("/api/v1/whoami", requireAuth, (req, res) => {
  const user = req.user!;
  const body: WhoAmIResponse = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName,
    families: [],
  };
  res.json({ data: body });
});

// Proxy routes: auth verified at edge, uid passed downstream via X-User-Id
const PROXY_ROUTES: Array<[string, string, string, string]> = [
  ["/api/v1/families", FAMILY_SERVICE_URL, "/api/v1/families", "/families"],
  ["/api/v1/calendar", CALENDAR_SERVICE_URL, "/api/v1/calendar", "/calendar"],
  ["/api/v1/tasks", TASKS_SERVICE_URL, "/api/v1/tasks", "/tasks"],
  ["/api/v1/notifications", NOTIFICATION_SERVICE_URL, "/api/v1/notifications", "/notifications"],
  ["/api/v1/finance", FINANCE_SERVICE_URL, "/api/v1/finance", "/finance"],
  ["/api/v1/documents", DOCUMENT_SERVICE_URL, "/api/v1/documents", "/documents"],
  ["/api/v1/meals", MEAL_SERVICE_URL, "/api/v1/meals", "/meals"],
  ["/api/v1/travel", TRAVEL_SERVICE_URL, "/api/v1/travel", "/travel"],
  ["/api/v1/ai", AI_SERVICE_URL, "/api/v1/ai", "/ai"],
  ["/api/v1/knowledge-graph", KG_SERVICE_URL, "/api/v1/knowledge-graph", "/kg"],
  ["/api/v1/analytics", ANALYTICS_SERVICE_URL, "/api/v1/analytics", "/analytics"],
];

for (const [route, target, prefix, downstream] of PROXY_ROUTES) {
  app.use(route, requireAuth, fetchProxy(target, prefix, downstream));
}

// Catch-all error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[gateway error]", err);
  if (!res.headersSent) {
    res.status(err.status ?? 500).json({ error: { code: "internal_error", message: err.message } });
  }
});

app.listen(PORT, () => {
  console.log(`api-gateway listening on :${PORT}`);
});
