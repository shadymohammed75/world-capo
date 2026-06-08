const BASE = "http://localhost:80/api";

type Result = { name: string; pass: boolean; detail: string };
const results: Result[] = [];

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    results.push({ name, pass: true, detail: "OK" });
  } catch (e: unknown) {
    results.push({ name, pass: false, detail: e instanceof Error ? e.message : String(e) });
  }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function json(res: Response) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

// ─── HEALTH ───────────────────────────────────────────────────
await test("Health check returns 200 + status ok", async () => {
  const res = await fetch(`${BASE}/healthz`);
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  const body = await json(res);
  assert(body.status === "ok", `Expected status=ok, got ${JSON.stringify(body)}`);
});

// ─── FLAGS ────────────────────────────────────────────────────
await test("GET /flags returns array", async () => {
  const res = await fetch(`${BASE}/flags`);
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  const body = await json(res);
  assert(Array.isArray(body), `Expected array, got ${typeof body}`);
  assert(body.length > 0, `Expected flags in DB, got empty array`);
});

await test("GET /flags/counts returns per-team counts", async () => {
  const res = await fetch(`${BASE}/flags/counts`);
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  const body = await json(res);
  assert(Array.isArray(body), `Expected array`);
  const first = body[0];
  assert("teamId" in first && "count" in first, `Each item must have teamId+count, got: ${JSON.stringify(first)}`);
  assert(typeof first.count === "number", `count must be a number`);
});

await test("Flag counts total matches flags array length", async () => {
  const [flagsRes, countsRes] = await Promise.all([
    fetch(`${BASE}/flags`),
    fetch(`${BASE}/flags/counts`),
  ]);
  const flags = await json(flagsRes);
  const counts = await json(countsRes);
  const totalFromCounts = (counts as { count: number }[]).reduce((s: number, c: { count: number }) => s + c.count, 0);
  assert(totalFromCounts === flags.length, `Counts total (${totalFromCounts}) ≠ flags length (${flags.length})`);
});

// ─── PAYMENTS ─────────────────────────────────────────────────
let intentId: string | null = null;

await test("POST /payments/intent with valid teamId returns intentId", async () => {
  const res = await fetch(`${BASE}/payments/intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamId: "BRA", x: 500, y: 400 }),
  });
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  const body = await json(res);
  assert(typeof body.paymentIntentId === "string" && body.paymentIntentId.length > 0, `Expected paymentIntentId string`);
  intentId = body.paymentIntentId;
});

await test("POST /payments/intent with missing teamId returns 400", async () => {
  const res = await fetch(`${BASE}/payments/intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ x: 100, y: 100 }),
  });
  assert(res.status === 400, `Expected 400, got ${res.status}`);
});

await test("POST /payments/intent with unknown teamId returns 400", async () => {
  const res = await fetch(`${BASE}/payments/intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamId: "FAKE", x: 100, y: 100 }),
  });
  assert(res.status === 400, `Expected 400, got ${res.status}`);
});

await test("POST /payments/confirm-mock with valid id places flag", async () => {
  assert(intentId !== null, "No intentId from previous test");
  const flagsBefore = await json(await fetch(`${BASE}/flags`));
  const res = await fetch(`${BASE}/payments/confirm-mock/${intentId}`, { method: "POST" });
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  const body = await json(res);
  assert(body.success === true, `Expected success=true`);
  const flagsAfter = await json(await fetch(`${BASE}/flags`));
  assert(flagsAfter.length === flagsBefore.length + 1, `Flag count should have increased by 1`);
});

await test("POST /payments/confirm-mock with fake id returns 404", async () => {
  const res = await fetch(`${BASE}/payments/confirm-mock/fake_intent_does_not_exist`, { method: "POST" });
  assert(res.status === 404, `Expected 404, got ${res.status}`);
});

await test("POST /payments/confirm-mock same id twice returns 400 (already used)", async () => {
  assert(intentId !== null, "No intentId from previous test");
  const res = await fetch(`${BASE}/payments/confirm-mock/${intentId}`, { method: "POST" });
  assert(res.status === 400, `Expected 400 on duplicate confirm, got ${res.status}`);
});

// ─── GDPR ─────────────────────────────────────────────────────
await test("POST /gdpr/consent records consent", async () => {
  const res = await fetch(`${BASE}/gdpr/consent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: "test-session-" + Date.now(), analytics: true, marketing: false }),
  });
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  const body = await json(res);
  assert("saved" in body || "recorded" in body || "success" in body, `Unexpected consent response: ${JSON.stringify(body)}`);
  assert(body.saved === true || body.recorded === true || body.success === true, `Expected truthy confirmation`);
});

await test("POST /gdpr/consent with missing fields returns 400", async () => {
  const res = await fetch(`${BASE}/gdpr/consent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert(res.status === 400, `Expected 400, got ${res.status}`);
});

await test("POST /gdpr/erasure with email returns 200", async () => {
  const res = await fetch(`${BASE}/gdpr/erasure`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "test-erase-" + Date.now() + "@example.com" }),
  });
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  const body = await json(res);
  assert("acknowledged" in body, `Expected acknowledged in response, got: ${JSON.stringify(body)}`);
  assert(body.acknowledged === true, `Expected acknowledged=true`);
});

// ─── ADMIN ────────────────────────────────────────────────────
await test("GET /admin/stats returns revenue + flag totals", async () => {
  const res = await fetch(`${BASE}/admin/stats`);
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  const body = await json(res);
  assert("totalFlags" in body && "totalRevenue" in body, `Expected totalFlags+totalRevenue, got ${JSON.stringify(body)}`);
  assert(body.totalFlags > 0, `Expected totalFlags > 0 (seeded data)`);
  assert(typeof body.totalRevenue === "number", `totalRevenue must be a number`);
});

await test("GET /admin/payments returns paginated list", async () => {
  const res = await fetch(`${BASE}/admin/payments`);
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  const body = await json(res);
  assert("payments" in body && Array.isArray(body.payments), `Expected payments array`);
  assert("total" in body && typeof body.total === "number", `Expected total number`);
});

await test("GET /admin/team-breakdown returns per-team data", async () => {
  const res = await fetch(`${BASE}/admin/team-breakdown`);
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  const body = await json(res);
  assert(Array.isArray(body), `Expected array`);
  assert(body.length > 0, `Expected at least one team`);
  const first = body[0];
  assert("teamId" in first && "flagCount" in first, `Expected teamId+flagCount per item, got: ${JSON.stringify(first)}`);
});

// ─── AUTO-REFRESH (smoke-test that two polls return same shape) ─
await test("Flags endpoint is stable across two consecutive calls", async () => {
  const [r1, r2] = await Promise.all([
    fetch(`${BASE}/flags`),
    fetch(`${BASE}/flags`),
  ]);
  assert(r1.status === 200 && r2.status === 200, "Both calls should return 200");
  const [b1, b2] = await Promise.all([json(r1), json(r2)]);
  assert(Array.isArray(b1) && Array.isArray(b2), "Both should be arrays");
  assert(b1.length === b2.length, `Lengths differ between polls: ${b1.length} vs ${b2.length}`);
});

// ─── PRINT RESULTS ────────────────────────────────────────────
const PASS = "\x1b[32m✓\x1b[0m";
const FAIL = "\x1b[31m✗\x1b[0m";
const passed = results.filter(r => r.pass).length;
const failed = results.filter(r => !r.pass).length;

console.log("\n══════════════════════════════════════════════════");
console.log("  WORLD CAPO — API Feature Tests");
console.log("══════════════════════════════════════════════════\n");

for (const r of results) {
  console.log(`  ${r.pass ? PASS : FAIL}  ${r.name}`);
  if (!r.pass) console.log(`       ↳ ${r.detail}`);
}

console.log(`\n──────────────────────────────────────────────────`);
console.log(`  ${passed} passed  ·  ${failed} failed  ·  ${results.length} total`);
console.log(`──────────────────────────────────────────────────\n`);

if (failed > 0) process.exit(1);
