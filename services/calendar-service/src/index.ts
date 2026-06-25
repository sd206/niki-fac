import express from "express";
import { pinoHttp } from "pino-http";
import { calendarRouter } from "./routes.js";

const app = express();
app.use(pinoHttp());
app.use(express.json());

const PORT = Number(process.env.PORT ?? 8082);

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok", service: "calendar-service" });
});

app.use("/calendar", calendarRouter);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`calendar-service listening on :${PORT}`);
});
