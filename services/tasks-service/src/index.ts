import express from "express";
import { pinoHttp } from "pino-http";
import { tasksRouter } from "./routes.js";

const app = express();
app.use(pinoHttp());
app.use(express.json());

const PORT = Number(process.env.PORT ?? 8083);

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok", service: "tasks-service" });
});

app.use("/tasks", tasksRouter);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`tasks-service listening on :${PORT}`);
});
