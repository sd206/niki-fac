import express from "express";
import { pinoHttp } from "pino-http";
import { analyticsRouter } from "./routes.js";

const app = express();
app.use(pinoHttp());
app.use(express.json());

const PORT = Number(process.env.PORT ?? 8091);

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok", service: "analytics-service" });
});

app.use("/analytics", analyticsRouter);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`analytics-service listening on :${PORT}`);
});
