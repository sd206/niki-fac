import express from "express";
import { pinoHttp } from "pino-http";
import { financeRouter } from "./routes.js";

const app = express();
app.use(pinoHttp());
app.use(express.json());

const PORT = Number(process.env.PORT ?? 8085);

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok", service: "finance-service" });
});

app.use("/finance", financeRouter);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`finance-service listening on :${PORT}`);
});
