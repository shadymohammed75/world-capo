import { Router, type IRouter } from "express";
import { db, flagsTable } from "@workspace/db";
import { desc, count } from "drizzle-orm";
import { ListFlagsResponse, GetFlagCountsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

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
