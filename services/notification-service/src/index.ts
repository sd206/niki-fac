import express from "express";
import { pinoHttp } from "pino-http";
import { notificationRouter } from "./routes.js";

const app = express();
app.use(pinoHttp());
app.use(express.json());

const PORT = Number(process.env.PORT ?? 8084);

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok", service: "notification-service" });
});

app.use("/notifications", notificationRouter);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`notification-service listening on :${PORT}`);
});
