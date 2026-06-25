import express from "express";
import { pinoHttp } from "pino-http";
import { mealRouter } from "./routes.js";

const app = express();
app.use(pinoHttp());
app.use(express.json());

const PORT = Number(process.env.PORT ?? 8087);

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok", service: "meal-service" });
});

app.use("/meals", mealRouter);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`meal-service listening on :${PORT}`);
});
