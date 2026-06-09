import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";

const router: IRouter = Router();

router.get("/healthz", async (req, res) => {
  // Verify the database is actually reachable so load-balancer probes fail
  // when Postgres is down, not just when the process is dead.
  try {
    await pool.query("SELECT 1");
    res.json(HealthCheckResponse.parse({ status: "ok" }));
  } catch (err) {
    req.log.error({ err }, "Health check failed: database unreachable");
    res.status(503).json({ status: "error", error: "Database unreachable" });
  }
});

export default router;
