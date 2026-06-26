import "express-async-errors";
import express from "express";
import { pinoHttp } from "pino-http";
import { kgRouter } from "./routes.js";

const app = express();
app.use(pinoHttp());
app.use(express.json());

const PORT = Number(process.env.PORT ?? 8090);

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok", service: "knowledge-graph-service" });
});

app.use("/kg", kgRouter);

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[error]", err);
  if (!res.headersSent) {
    res.status(err.status ?? 500).json({ error: { code: "internal_error", message: err.message } });
  }
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`knowledge-graph-service listening on :${PORT}`);
});
