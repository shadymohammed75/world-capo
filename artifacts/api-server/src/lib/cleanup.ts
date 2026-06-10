import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

const ONE_HOUR_MS = 60 * 60 * 1000;

/**
 * Deletes covered flags — all but the most recently placed flag in each grid
 * cell. Only the visible (latest) flag per cell is kept, reclaiming space from
 * flags that have been covered over by newer placements.
 */
export async function cleanupCoveredFlags(): Promise<number> {
  const result = await db.execute(sql`
    DELETE FROM flags
    WHERE id NOT IN (
      SELECT DISTINCT ON (x, y) id
      FROM flags
      ORDER BY x, y, created_at DESC
    )
  `);
  const deleted = (result as { rowCount?: number }).rowCount ?? 0;
  if (deleted > 0) logger.info({ deleted }, "Cleaned up covered flags");
  return deleted;
}

/** Runs the covered-flag cleanup once on startup and then hourly. */
export function startCleanupJob(): void {
  cleanupCoveredFlags().catch((err) => logger.error({ err }, "Initial flag cleanup failed"));
  setInterval(() => {
    cleanupCoveredFlags().catch((err) => logger.error({ err }, "Scheduled flag cleanup failed"));
  }, ONE_HOUR_MS);
  logger.info({ intervalMs: ONE_HOUR_MS }, "Covered-flag cleanup job scheduled");
}
