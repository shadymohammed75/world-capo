import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

// Behind a reverse proxy / load balancer, the real client IP arrives in
// X-Forwarded-For. Enable this (e.g. TRUST_PROXY=1 for one proxy hop) so
// express-rate-limit and IP hashing see the real client, not the proxy.
// Left off by default so a directly-exposed app never trusts a spoofed header.
const trustProxy = process.env.TRUST_PROXY;
if (trustProxy) {
  const hops = Number(trustProxy);
  app.set("trust proxy", Number.isNaN(hops) ? trustProxy : hops);
}

const allowedOrigin = process.env.ALLOWED_ORIGIN;

app.use(helmet());
app.use(
  cors({
    origin: allowedOrigin
      ? allowedOrigin
      : process.env.NODE_ENV === "production"
        ? false
        : true,
    credentials: true,
  }),
);
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// 404 — unmatched route
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not found" });
});

// Global error handler — keeps stack traces out of responses
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  req.log.error({ err }, "Unhandled request error");
  if (res.headersSent) return;
  res.status(500).json({ error: "Internal server error" });
});

export default app;
