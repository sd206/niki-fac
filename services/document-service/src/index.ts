import express from "express";
import { pinoHttp } from "pino-http";
import { documentRouter } from "./routes.js";

const app = express();
app.use(pinoHttp());
app.use(express.json());

const PORT = Number(process.env.PORT ?? 8086);

app.get("/healthz", (_req, res) => {
  res.json({ status: "ok", service: "document-service" });
});

app.use("/documents", documentRouter);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`document-service listening on :${PORT}`);
});
