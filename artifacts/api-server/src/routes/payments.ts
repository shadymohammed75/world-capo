import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { rateLimit } from "express-rate-limit";
import { db, paymentsTable, flagsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const VALID_TEAM_IDS = new Set([
  "DZA","ARG","AUT","AUS","BEL","BIH","BRA","CPV","CAN","COL","COD","CIV","CRO","CZE","CUW",
  "ECU","EGY","ENG","FRA","DEU","GHA","HTI","IRN","IRQ","JPN","JOR","KOR","MEX","MAR","NLD",
  "NZL","NOR","PAN","PRY","POR","QAT","SAU","SCO","SEN","RSA","ESP","SWE","CHE","TUN","TUR",
  "USA","URY","UZB",
]);
import { createHash } from "crypto";
import {
  CreatePaymentIntentBody,
  CreatePaymentIntentResponse,
  StripeWebhookResponse,
} from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const FLAG_PRICE_CENTS = 70; // €0.70

const paymentIntentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many payment requests, please try again later" },
});

function hashValue(val: string): string {
  return createHash("sha256").update(val).digest("hex");
}

// Middleware to capture raw body for Stripe signature verification
function rawBodyMiddleware(req: Request & { rawBody?: Buffer }, _res: Response, next: NextFunction): void {
  const chunks: Buffer[] = [];
  req.on("data", (chunk: Buffer) => chunks.push(chunk));
  req.on("end", () => {
    req.rawBody = Buffer.concat(chunks);
    next();
  });
  req.on("error", next);
}

// GET /api/payments/config — returns publishable key for frontend
router.get("/payments/config", (_req, res): void => {
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY ?? null;
  res.json({ publishableKey, devMode: !process.env.STRIPE_SECRET_KEY });
});

// POST /api/payments/intent
router.post("/payments/intent", paymentIntentLimiter, async (req, res): Promise<void> => {
  const parsed = CreatePaymentIntentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { teamId, email } = parsed.data;

  if (!VALID_TEAM_IDS.has(teamId)) {
    res.status(400).json({ error: `Unknown team: ${teamId}` });
    return;
  }

  // The wall is a fixed 2000×1500 canvas — clamp so a crafted request can't
  // place a flag off-screen.
  const x = Math.min(2000, Math.max(0, parsed.data.x));
  const y = Math.min(1500, Math.max(0, parsed.data.y));

  const stripeKey = process.env.STRIPE_SECRET_KEY;
  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "";
  const emailHash = email ? hashValue(email) : null;
  const ipHash = hashValue(ip);

  if (!stripeKey) {
    // Dev mode: create a mock intent
    const mockId = `pi_mock_${Date.now()}_${Math.random().toString(36).slice(2)}`;

    await db.insert(paymentsTable).values({
      stripePaymentIntentId: mockId,
      amountCents: FLAG_PRICE_CENTS,
      currency: "eur",
      status: "pending",
      teamId,
      flagX: x,
      flagY: y,
      emailHash,
      ipHash,
    });

    res.json(CreatePaymentIntentResponse.parse({
      clientSecret: `${mockId}_secret_mock`,
      paymentIntentId: mockId,
    }));
    return;
  }

  try {
    const { default: Stripe } = await import("stripe");
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-05-28.basil" as any });

    const paymentIntent = await stripe.paymentIntents.create({
      amount: FLAG_PRICE_CENTS,
      currency: "eur",
      // Enables cards + wallets (Apple Pay / Google Pay / Link) automatically,
      // based on what's turned on in your Stripe Dashboard.
      automatic_payment_methods: { enabled: true },
      metadata: { teamId, x: String(x), y: String(y) },
      ...(email ? { receipt_email: email } : {}),
    });

    await db.insert(paymentsTable).values({
      stripePaymentIntentId: paymentIntent.id,
      amountCents: FLAG_PRICE_CENTS,
      currency: "eur",
      status: "pending",
      teamId,
      flagX: x,
      flagY: y,
      emailHash,
      ipHash,
    });

    res.json(CreatePaymentIntentResponse.parse({
      clientSecret: paymentIntent.client_secret!,
      paymentIntentId: paymentIntent.id,
    }));
  } catch (err) {
    req.log.error({ err }, "Failed to create Stripe PaymentIntent");
    res.status(500).json({ error: "Payment system error" });
  }
});

// POST /api/payments/webhook
router.post(
  "/payments/webhook",
  rawBodyMiddleware,
  async (req: Request & { rawBody?: Buffer }, res): Promise<void> => {
    const sig = req.headers["stripe-signature"] as string | undefined;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const stripeKey = process.env.STRIPE_SECRET_KEY;

    if (stripeKey && sig && webhookSecret) {
      try {
        const { default: Stripe } = await import("stripe");
        const stripe = new Stripe(stripeKey, { apiVersion: "2025-05-28.basil" as any });
        const event = stripe.webhooks.constructEvent(req.rawBody ?? Buffer.alloc(0), sig, webhookSecret);

        if (event.type === "payment_intent.succeeded") {
          await handlePaymentSucceeded(event.data.object as any);
        } else if (event.type === "payment_intent.payment_failed") {
          await handlePaymentFailed(event.data.object as any);
        }
      } catch (err) {
        req.log.warn({ err }, "Stripe webhook verification failed");
        res.status(400).json({ error: "Invalid signature" });
        return;
      }
    } else {
      // Dev mode: trust body directly
      const body = req.body;
      if (body?.type === "payment_intent.succeeded") {
        await handlePaymentSucceeded(body.data?.object ?? body);
      }
    }

    res.json(StripeWebhookResponse.parse({ received: true }));
  }
);

// POST /api/payments/confirm-mock/:intentId — for development simulation only
router.post("/payments/confirm-mock/:intentId", async (req, res): Promise<void> => {
  if (process.env.STRIPE_SECRET_KEY) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const raw = Array.isArray(req.params.intentId) ? req.params.intentId[0] : req.params.intentId;

  // Check if it exists at all
  const [existing] = await db
    .select()
    .from(paymentsTable)
    .where(eq(paymentsTable.stripePaymentIntentId, raw));

  if (!existing) {
    res.status(404).json({ error: "Payment intent not found" });
    return;
  }

  if (existing.status === "succeeded") {
    res.status(400).json({ error: "Payment already confirmed" });
    return;
  }

  const [payment] = await db
    .update(paymentsTable)
    .set({ status: "succeeded" })
    .where(and(
      eq(paymentsTable.stripePaymentIntentId, raw),
      eq(paymentsTable.status, "pending"),
    ))
    .returning();

  if (!payment) {
    res.status(400).json({ error: "Payment already confirmed" });
    return;
  }

  await db.insert(flagsTable).values({
    teamId: payment.teamId,
    x: payment.flagX ?? 500,
    y: payment.flagY ?? 300,
    paymentId: payment.stripePaymentIntentId,
  });

  res.json({ success: true, flag: { teamId: payment.teamId, x: payment.flagX, y: payment.flagY } });
});

async function handlePaymentSucceeded(paymentIntent: { id: string }) {
  try {
    // Only transition pending → succeeded. Stripe can deliver the same webhook
    // more than once; the status guard ensures we place exactly one flag.
    const [payment] = await db
      .update(paymentsTable)
      .set({ status: "succeeded" })
      .where(and(
        eq(paymentsTable.stripePaymentIntentId, paymentIntent.id),
        eq(paymentsTable.status, "pending"),
      ))
      .returning();

    if (payment) {
      await db.insert(flagsTable).values({
        teamId: payment.teamId,
        x: payment.flagX ?? 500,
        y: payment.flagY ?? 300,
        paymentId: payment.stripePaymentIntentId,
      });
      logger.info({ paymentIntentId: paymentIntent.id }, "Flag placed after payment succeeded");
    } else {
      logger.info({ paymentIntentId: paymentIntent.id }, "Duplicate or already-processed webhook ignored");
    }
  } catch (err) {
    logger.error({ err, paymentIntentId: paymentIntent.id }, "Failed to process successful payment");
  }
}

async function handlePaymentFailed(paymentIntent: { id: string }) {
  await db
    .update(paymentsTable)
    .set({ status: "failed" })
    .where(eq(paymentsTable.stripePaymentIntentId, paymentIntent.id));
}

export default router;
