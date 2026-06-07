import { pgTable, serial, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const gdprConsentsTable = pgTable("gdpr_consents", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(),
  ipHash: text("ip_hash"),
  analytics: boolean("analytics").notNull().default(false),
  marketing: boolean("marketing").notNull().default(false),
  consentedAt: timestamp("consented_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertGdprConsentSchema = createInsertSchema(gdprConsentsTable).omit({ id: true, consentedAt: true });
export type InsertGdprConsent = z.infer<typeof insertGdprConsentSchema>;
export type GdprConsent = typeof gdprConsentsTable.$inferSelect;
