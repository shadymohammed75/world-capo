import { Router, type IRouter } from "express";
import { db, gdprConsentsTable, paymentsTable, flagsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import { RecordConsentBody, RecordConsentResponse, RequestErasureBody, RequestErasureResponse } from "@workspace/api-zod";

const router: IRouter = Router();

function hashValue(val: string): string {
  return createHash("sha256").update(val).digest("hex");
}

router.post("/gdpr/consent", async (req, res): Promise<void> => {
  const parsed = RecordConsentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ?? req.socket.remoteAddress ?? "";
  const ipHash = hashValue(ip);

  await db.insert(gdprConsentsTable).values({
    sessionId: parsed.data.sessionId,
    ipHash,
    analytics: parsed.data.analytics,
    marketing: parsed.data.marketing,
  });

  res.json(RecordConsentResponse.parse({ saved: true }));
});

router.post("/gdpr/erasure", async (req, res): Promise<void> => {
  const parsed = RequestErasureBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const emailHash = hashValue(parsed.data.email);

  await db.update(paymentsTable)
    .set({ emailHash: "[ERASED]" })
    .where(eq(paymentsTable.emailHash, emailHash));

  req.log.info({ emailHash }, "GDPR erasure request processed");

  res.json(RequestErasureResponse.parse({
    acknowledged: true,
    message: "Your personal data associated with this email has been anonymised. Flags placed remain on the wall as they contain no personal data.",
  }));
});

export default router;
