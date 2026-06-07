import { Router, type IRouter } from "express";
import { db, paymentsTable, flagsTable } from "@workspace/db";
import { eq, count, sum, desc, and, gte } from "drizzle-orm";
import {
  GetAdminStatsResponse,
  ListAdminPaymentsResponse,
  GetTeamBreakdownResponse,
  ListAdminPaymentsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/admin/stats", async (req, res): Promise<void> => {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const [allPayments, todayPayments, totalFlagsResult, todayFlagsResult] = await Promise.all([
    db.select().from(paymentsTable),
    db.select().from(paymentsTable).where(gte(paymentsTable.createdAt, todayStart)),
    db.select({ count: count() }).from(flagsTable),
    db.select({ count: count() }).from(flagsTable).where(gte(flagsTable.createdAt, todayStart)),
  ]);

  const succeeded = allPayments.filter((p) => p.status === "succeeded");
  const totalRevenue = succeeded.reduce((acc, p) => acc + p.amountCents / 100, 0);
  const revenueToday = todayPayments
    .filter((p) => p.status === "succeeded")
    .reduce((acc, p) => acc + p.amountCents / 100, 0);

  const successRate = allPayments.length > 0
    ? (succeeded.length / allPayments.length) * 100
    : 0;

  res.json(GetAdminStatsResponse.parse({
    totalRevenue,
    totalFlags: totalFlagsResult[0]?.count ?? 0,
    totalPayments: allPayments.length,
    successRate: Math.round(successRate * 10) / 10,
    revenueToday,
    flagsToday: todayFlagsResult[0]?.count ?? 0,
  }));
});

router.get("/admin/payments", async (req, res): Promise<void> => {
  const qp = ListAdminPaymentsQueryParams.safeParse(req.query);
  const page = qp.success && qp.data.page ? qp.data.page : 1;
  const limit = qp.success && qp.data.limit ? qp.data.limit : 20;
  const status = qp.success && qp.data.status ? qp.data.status : undefined;

  const baseQuery = db.select().from(paymentsTable);

  let filtered = status
    ? db.select().from(paymentsTable).where(eq(paymentsTable.status, status))
    : db.select().from(paymentsTable);

  const [payments, totalResult] = await Promise.all([
    filtered.orderBy(desc(paymentsTable.createdAt)).limit(limit).offset((page - 1) * limit),
    db.select({ count: count() }).from(paymentsTable),
  ]);

  res.json(ListAdminPaymentsResponse.parse({
    payments: payments.map((p) => ({
      id: p.id,
      stripePaymentIntentId: p.stripePaymentIntentId,
      amountCents: p.amountCents,
      currency: p.currency,
      status: p.status,
      teamId: p.teamId,
      createdAt: p.createdAt.toISOString(),
    })),
    total: totalResult[0]?.count ?? 0,
    page,
    limit,
  }));
});

router.get("/admin/team-breakdown", async (req, res): Promise<void> => {
  const [payments, flags] = await Promise.all([
    db.select().from(paymentsTable).where(eq(paymentsTable.status, "succeeded")),
    db.select().from(flagsTable),
  ]);

  const revenueMap: Record<string, number> = {};
  for (const p of payments) {
    revenueMap[p.teamId] = (revenueMap[p.teamId] ?? 0) + p.amountCents / 100;
  }

  const flagCountMap: Record<string, number> = {};
  for (const f of flags) {
    flagCountMap[f.teamId] = (flagCountMap[f.teamId] ?? 0) + 1;
  }

  const allTeamIds = new Set([...Object.keys(revenueMap), ...Object.keys(flagCountMap)]);
  const result = Array.from(allTeamIds).map((teamId) => ({
    teamId,
    flagCount: flagCountMap[teamId] ?? 0,
    revenue: revenueMap[teamId] ?? 0,
  })).sort((a, b) => b.flagCount - a.flagCount);

  res.json(GetTeamBreakdownResponse.parse(result));
});

export default router;
