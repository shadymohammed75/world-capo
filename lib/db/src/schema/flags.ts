import { pgTable, serial, text, real, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const flagsTable = pgTable("flags", {
  id: serial("id").primaryKey(),
  teamId: text("team_id").notNull(),
  x: real("x").notNull(),
  y: real("y").notNull(),
  paymentId: text("payment_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("flags_team_id_idx").on(table.teamId),
  index("flags_created_at_idx").on(table.createdAt),
]);

export const insertFlagSchema = createInsertSchema(flagsTable).omit({ id: true, createdAt: true });
export type InsertFlag = z.infer<typeof insertFlagSchema>;
export type Flag = typeof flagsTable.$inferSelect;
