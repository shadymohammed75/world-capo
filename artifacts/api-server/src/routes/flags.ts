import { Router, type IRouter } from "express";
import { rateLimit } from "express-rate-limit";
import { db, flagsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
import { ListFlagsResponse, GetFlagCountsResponse } from "@workspace/api-zod";
import { VALID_TEAM_IDS } from "../lib/teams";
import { GRID_COLS, GRID_ROWS, clampCell } from "../lib/grid";

const router: IRouter = Router();

// Limits free flag spam during the no-payment launch period.
const freeFlagLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many flags placed, please try again later" },
});

// The currently-visible flag per cell: one row per (x,y), the most recently
// placed. A newer flag on the same cell "covers" the older ones, which remain
// in the table until the hourly cleanup removes them.
function latestPerCell() {
  return db
    .selectDistinctOn([flagsTable.x, flagsTable.y], {
      id: flagsTable.id,
      teamId: flagsTable.teamId,
      x: flagsTable.x,
      y: flagsTable.y,
      createdAt: flagsTable.createdAt,
    })
    .from(flagsTable)
    .orderBy(flagsTable.x, flagsTable.y, desc(flagsTable.createdAt));
}

// POST /api/flags — place a flag WITHOUT payment. Only enabled in free-launch
// mode (FREE_MODE=true); otherwise hidden so flags can't be placed for free
// once payments are switched on. The paid flow remains untouched.
// The flag snaps to a grid cell; placing on an occupied cell covers it.
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

  const col = clampCell(x, GRID_COLS);
  const row = clampCell(y, GRID_ROWS);

  const [flag] = await db
    .insert(flagsTable)
    .values({ teamId, x: col, y: row, paymentId: null })
    .returning();

  res.json({ success: true, flag: { id: flag.id, teamId: flag.teamId, x: flag.x, y: flag.y } });
});

router.get("/flags", async (req, res): Promise<void> => {
  const flags = await latestPerCell();

  res.json(ListFlagsResponse.parse(flags.map((f) => ({
    id: f.id,
    teamId: f.teamId,
    x: f.x,
    y: f.y,
    createdAt: f.createdAt.toISOString(),
  }))));
});

router.get("/flags/counts", async (req, res): Promise<void> => {
  // Leaderboard = current territory held: count one flag per occupied cell
  // (the visible/latest one), grouped by team. Covered flags don't count.
  const cells = await latestPerCell();

  const countMap: Record<string, number> = {};
  for (const c of cells) countMap[c.teamId] = (countMap[c.teamId] ?? 0) + 1;

  const result = Object.entries(countMap).map(([teamId, count]) => ({ teamId, count }));
  res.json(GetFlagCountsResponse.parse(result));
});

export default router;
