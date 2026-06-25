import express from "express";
import { pinoHttp } from "pino-http";
import { aiRouter } from "./routes.js";

const app = express();
app.use(pinoHttp());
app.use(express.json());

const PORT = Number(process.env.PORT ?? 8089);

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok", service: "ai-service" });
});

app.use("/ai", aiRouter);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`ai-service listening on :${PORT}`);
});
