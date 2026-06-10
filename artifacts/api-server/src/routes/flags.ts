import { Router, type IRouter } from "express";
import { rateLimit } from "express-rate-limit";
import { db, flagsTable } from "@workspace/db";
import { desc, count } from "drizzle-orm";
import { ListFlagsResponse, GetFlagCountsResponse } from "@workspace/api-zod";
import { VALID_TEAM_IDS } from "../lib/teams";

const router: IRouter = Router();

// Limits free flag spam during the no-payment launch period.
const freeFlagLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many flags placed, please try again later" },
});

// POST /api/flags — place a flag WITHOUT payment. Only enabled in free-launch
// mode (FREE_MODE=true); otherwise hidden so flags can't be placed for free
// once payments are switched on. The paid flow remains untouched.
router.post("/flags", freeFlagLimiter, async (req, res): Promise<void> => {
  if (process.env.FREE_MODE !== "true") {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const { teamId, x, y } = (req.body ?? {}) as { teamId?: unknown; x?: unknown; y?: unknown };

  if (typeof teamId !== "string" || !VALID_TEAM_IDS.has(teamId)) {
    res.status(400).json({ error: "Invalid or unknown team" });
    return;
  }

  // Clamp to the 2000×1500 canvas so a crafted request can't place off-screen.
  const flagX = Math.min(2000, Math.max(0, Number(x) || 0));
  const flagY = Math.min(1500, Math.max(0, Number(y) || 0));

  const [flag] = await db
    .insert(flagsTable)
    .values({ teamId, x: flagX, y: flagY, paymentId: null })
    .returning();

  res.json({ success: true, flag: { id: flag.id, teamId: flag.teamId, x: flag.x, y: flag.y } });
});

router.get("/flags", async (req, res): Promise<void> => {
  const flags = await db
    .select()
    .from(flagsTable)
    .orderBy(desc(flagsTable.createdAt))
    .limit(2000);

  res.json(ListFlagsResponse.parse(flags.map((f) => ({
    id: f.id,
    teamId: f.teamId,
    x: f.x,
    y: f.y,
    createdAt: f.createdAt.toISOString(),
  }))));
});

router.get("/flags/counts", async (req, res): Promise<void> => {
  // Aggregate in the database (SELECT team_id, COUNT(*) ... GROUP BY team_id)
  // instead of pulling every row and counting in JS.
  const rows = await db
    .select({ teamId: flagsTable.teamId, count: count() })
    .from(flagsTable)
    .groupBy(flagsTable.teamId);

  const result = rows.map((r) => ({ teamId: r.teamId, count: Number(r.count) }));
  res.json(GetFlagCountsResponse.parse(result));
});

export default router;
