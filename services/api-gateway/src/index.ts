import type { WhoAmIResponse } from "@niki/shared-types";
import cors from "cors";
import express from "express";
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware";
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
 * Builds an app-level proxy that only handles requests under `prefix` (so the
 * full URL is preserved for rewriting), forwards the verified identity
 * downstream, and re-streams the JSON body consumed by express.json().
 */
function serviceProxy(target: string, prefix: string, downstream: string) {
  console.log(`[proxy] ${prefix} -> ${target}${downstream}`);
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathFilter: (path) => path.startsWith(prefix),
    pathRewrite: { [`^${prefix}`]: downstream },
    on: {
      proxyReq: (proxyReq, req) => {
        const user = (req as express.Request).user;
        if (user) {
          proxyReq.setHeader("x-user-id", user.uid);
          proxyReq.setHeader("x-user-email", user.email ?? "");
          proxyReq.setHeader("x-user-name", user.displayName ?? "");
        }
        fixRequestBody(proxyReq, req as express.Request);
      },
      error: (err, req, res) => {
        console.error(`[proxy error] ${prefix} -> ${target}:`, err.message, (err as NodeJS.ErrnoException).code);
        if (res && "headersSent" in res && !res.headersSent) {
          (res as express.Response).status(503).json({ error: { code: "proxy_error", message: err.message, target } });
        }
      },
    },
  });
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
      results[name] = `ERROR: ${err.message} (code: ${err.code ?? "none"})`;
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
// uid is passed downstream via X-User-Id. requireAuth is mounted on the path
// so unauthenticated requests are rejected before the app-level proxy runs.
app.use("/api/v1/families", requireAuth);
app.use("/api/v1/calendar", requireAuth);
app.use("/api/v1/tasks", requireAuth);
app.use("/api/v1/notifications", requireAuth);
app.use("/api/v1/finance", requireAuth);
app.use("/api/v1/documents", requireAuth);
app.use("/api/v1/meals", requireAuth);
app.use("/api/v1/travel", requireAuth);
app.use("/api/v1/ai", requireAuth);
app.use("/api/v1/knowledge-graph", requireAuth);
app.use("/api/v1/analytics", requireAuth);
app.use(serviceProxy(FAMILY_SERVICE_URL, "/api/v1/families", "/families"));
app.use(serviceProxy(CALENDAR_SERVICE_URL, "/api/v1/calendar", "/calendar"));
app.use(serviceProxy(TASKS_SERVICE_URL, "/api/v1/tasks", "/tasks"));
app.use(serviceProxy(NOTIFICATION_SERVICE_URL, "/api/v1/notifications", "/notifications"));
app.use(serviceProxy(FINANCE_SERVICE_URL, "/api/v1/finance", "/finance"));
app.use(serviceProxy(DOCUMENT_SERVICE_URL, "/api/v1/documents", "/documents"));
app.use(serviceProxy(MEAL_SERVICE_URL, "/api/v1/meals", "/meals"));
app.use(serviceProxy(TRAVEL_SERVICE_URL, "/api/v1/travel", "/travel"));
app.use(serviceProxy(AI_SERVICE_URL, "/api/v1/ai", "/ai"));
app.use(serviceProxy(KG_SERVICE_URL, "/api/v1/knowledge-graph", "/kg"));
app.use(serviceProxy(ANALYTICS_SERVICE_URL, "/api/v1/analytics", "/analytics"));

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`api-gateway listening on :${PORT}`);
});
