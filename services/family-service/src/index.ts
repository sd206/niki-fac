import express from "express";
import { pinoHttp } from "pino-http";
import { familyRouter } from "./routes.js";

const app = express();
app.use(pinoHttp());
app.use(express.json());

const PORT = Number(process.env.PORT ?? 8081);

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok", service: "family-service" });
});

app.use("/families", familyRouter);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`family-service listening on :${PORT}`);
});
