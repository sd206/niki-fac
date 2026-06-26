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
 * Fetch-based proxy that forwards requests to a backend service.
 * Replaces http-proxy-middleware which had connectivity issues on Cloud Run.
 */
function fetchProxy(target: string, prefix: string, downstream: string) {
  console.log(`[proxy] ${prefix} -> ${target}${downstream}`);
  return async (req: express.Request, res: express.Response) => {
    const user = req.user;
    const rewrittenPath = req.originalUrl.replace(new RegExp(`^${prefix}`), downstream);
    const url = `${target}${rewrittenPath}`;

    const headers: Record<string, string> = {
      "Content-Type": req.get("Content-Type") ?? "application/json",
    };
    if (user) {
      headers["x-user-id"] = user.uid;
      headers["x-user-email"] = user.email ?? "";
      headers["x-user-name"] = user.displayName ?? "";
    }

    try {
      const fetchOptions: RequestInit = {
        method: req.method,
        headers,
      };
      if (req.method !== "GET" && req.method !== "HEAD") {
        fetchOptions.body = JSON.stringify(req.body);
      }
      const resp = await fetch(url, { ...fetchOptions, signal: AbortSignal.timeout(60000) });
      const contentType = resp.headers.get("content-type") ?? "application/json";
      res.status(resp.status).type(contentType);
      const body = await resp.text();
      res.send(body);
    } catch (err: any) {
      console.error(`[proxy error] ${prefix} -> ${target}:`, err.message, err.cause?.code ?? "");
      res.status(503).json({ error: { code: "proxy_error", message: err.message, target } });
    }
  };
}

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok", service: "api-gateway" });
});

app.get("/debug/proxy-test", async (_req, res) => {
  const results: Record<string, string> = {};
  const urls: Record<string, string | undefined> = {
    FAMILY_SERVICE_URL,
    CALENDAR_SERVICE_URL,
    TASKS_SERVICE_URL,
  };
  for (const [name, url] of Object.entries(urls)) {
    if (!url) { results[name] = "not set"; continue; }
    try {
      const resp = await fetch(`${url}/healthz`, { signal: AbortSignal.timeout(5000) });
      results[name] = `HTTP ${resp.status}`;
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

// Forward authenticated traffic. Auth is verified at the edge; the verified
// uid is passed downstream via X-User-Id.
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

app.listen(PORT, () => {
  console.log(`api-gateway listening on :${PORT}`);
});
