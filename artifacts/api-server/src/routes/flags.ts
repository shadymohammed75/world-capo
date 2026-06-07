import { Router, type IRouter } from "express";
import { db, flagsTable } from "@workspace/db";
import { desc } from "drizzle-orm";
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
  const flags = await db.select().from(flagsTable);

  const countMap: Record<string, number> = {};
  for (const flag of flags) {
    countMap[flag.teamId] = (countMap[flag.teamId] ?? 0) + 1;
  }

  const result = Object.entries(countMap).map(([teamId, count]) => ({ teamId, count }));
  res.json(GetFlagCountsResponse.parse(result));
});

export default router;
