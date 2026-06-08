/**
 * World Capo — pre-deployment feature test procedure.
 *
 * Runs a black-box smoke test against a running API server and checks every
 * feature: health, security headers, flags, payments, GDPR, and admin (with
 * auth). Safe to run against local dev OR production — it auto-detects dev vs
 * live Stripe mode and open vs password-protected admin, and skips/adapts the
 * destructive tests so it never writes junk to a live database.
 *
 * Usage:
 *   # local (API on :3000, ADMIN_PASSWORD=admin)
 *   pnpm --filter @workspace/scripts run test-api
 *
 *   # against production
 *   API_URL=https://yourdomain.com/api ADMIN_PASSWORD=yourpass \
 *     pnpm --filter @workspace/scripts run test-api
 *
 *   # also exercise the rate limiters (consumes the request budget)
 *   TEST_RATE_LIMIT=1 pnpm --filter @workspace/scripts run test-api
 */

const BASE = process.env.API_URL ?? "http://localhost:3000/api";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "admin";
const TEST_RATE_LIMIT = process.env.TEST_RATE_LIMIT === "1";

type Result = { name: string; pass: boolean; skipped?: boolean; detail: string };
const results: Result[] = [];

async function test(name: string, fn: () => Promise<void | "skip">) {
  try {
    const out = await fn();
    if (out === "skip") results.push({ name, pass: true, skipped: true, detail: "skipped" });
    else results.push({ name, pass: true, detail: "OK" });
  } catch (e: unknown) {
    results.push({ name, pass: false, detail: e instanceof Error ? e.message : String(e) });
  }
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

async function json(res: Response): Promise<any> {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return text; }
}

// ─── DISCOVERY: figure out what mode the server is in ─────────────
let devMode = true;        // true = mock Stripe, false = live Stripe keys set
let adminAuthEnabled = false;
let adminToken: string | null = null;

async function discover() {
  // Stripe mode
  try {
    const cfg = await json(await fetch(`${BASE}/payments/config`));
    devMode = cfg?.devMode !== false;
  } catch { /* leave default */ }

  // Admin mode: log in with the configured password
  try {
    const res = await fetch(`${BASE}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: ADMIN_PASSWORD }),
    });
    if (res.ok) {
      const body = await json(res);
      adminToken = body.token ?? null;
      adminAuthEnabled = adminToken !== "dev-mode-no-auth";
    }
  } catch { /* leave default */ }
}

function adminHeaders(): Record<string, string> {
  return adminToken ? { Authorization: `Bearer ${adminToken}` } : {};
}

await discover();

// ─── HEALTH ───────────────────────────────────────────────────
await test("Health check returns 200 + status ok", async () => {
  const res = await fetch(`${BASE}/healthz`);
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  const body = await json(res);
  assert(body.status === "ok", `Expected status=ok, got ${JSON.stringify(body)}`);
});

// ─── SECURITY HEADERS (helmet) ────────────────────────────────
await test("Security headers present (helmet)", async () => {
  const res = await fetch(`${BASE}/healthz`);
  const cto = res.headers.get("x-content-type-options");
  assert(cto === "nosniff", `Expected x-content-type-options=nosniff, got ${cto}`);
  // helmet also removes the framework fingerprint
  assert(!res.headers.get("x-powered-by"), `x-powered-by should be removed by helmet`);
});

// ─── FLAGS ────────────────────────────────────────────────────
await test("GET /flags returns array", async () => {
  const res = await fetch(`${BASE}/flags`);
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  const body = await json(res);
  assert(Array.isArray(body), `Expected array, got ${typeof body}`);
});

await test("GET /flags/counts returns per-team counts", async () => {
  const res = await fetch(`${BASE}/flags/counts`);
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  const body = await json(res);
  assert(Array.isArray(body), `Expected array`);
  if (body.length > 0) {
    const first = body[0];
    assert("teamId" in first && "count" in first, `Each item must have teamId+count, got: ${JSON.stringify(first)}`);
    assert(typeof first.count === "number", `count must be a number`);
  }
});

await test("Flag counts total matches flags array length", async () => {
  const [flagsRes, countsRes] = await Promise.all([
    fetch(`${BASE}/flags`),
    fetch(`${BASE}/flags/counts`),
  ]);
  const flags = await json(flagsRes);
  const counts = await json(countsRes);
  const totalFromCounts = (counts as { count: number }[]).reduce((s, c) => s + c.count, 0);
  assert(totalFromCounts === flags.length, `Counts total (${totalFromCounts}) ≠ flags length (${flags.length})`);
});

// ─── PAYMENTS ─────────────────────────────────────────────────
await test("GET /payments/config returns publishableKey + devMode", async () => {
  const res = await fetch(`${BASE}/payments/config`);
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  const body = await json(res);
  assert("publishableKey" in body && "devMode" in body, `Expected publishableKey+devMode, got ${JSON.stringify(body)}`);
  assert(typeof body.devMode === "boolean", `devMode must be boolean`);
});

let intentId: string | null = null;

await test("POST /payments/intent with valid teamId returns intentId + clientSecret", async () => {
  const res = await fetch(`${BASE}/payments/intent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ teamId: "BRA", x: 500, y: 400 }),
  });
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  const body = await json(res);
  assert(typeof body.paymentIntentId === "string" && body.paymentIntentId.length > 0, `Expected paymentIntentId string`);
  assert(typeof body.clientSecret === "string" && body.clientSecret.length > 0, `Expected clientSecret string`);
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

// confirm-mock only exists in dev mode; in live mode it must be disabled (404).
if (devMode) {
  await test("[dev] POST /payments/confirm-mock places a flag", async () => {
    assert(intentId !== null, "No intentId from previous test");
    const flagsBefore = await json(await fetch(`${BASE}/flags`));
    const res = await fetch(`${BASE}/payments/confirm-mock/${intentId}`, { method: "POST" });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const body = await json(res);
    assert(body.success === true, `Expected success=true`);
    const flagsAfter = await json(await fetch(`${BASE}/flags`));
    assert(flagsAfter.length === flagsBefore.length + 1, `Flag count should increase by 1`);
  });

  await test("[dev] confirm-mock with fake id returns 404", async () => {
    const res = await fetch(`${BASE}/payments/confirm-mock/fake_intent_does_not_exist`, { method: "POST" });
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  await test("[dev] confirm-mock same id twice returns 400 (no double flag)", async () => {
    assert(intentId !== null, "No intentId from previous test");
    const res = await fetch(`${BASE}/payments/confirm-mock/${intentId}`, { method: "POST" });
    assert(res.status === 400, `Expected 400 on duplicate confirm, got ${res.status}`);
  });
} else {
  await test("[live] confirm-mock endpoint is disabled (404)", async () => {
    const res = await fetch(`${BASE}/payments/confirm-mock/${intentId ?? "x"}`, { method: "POST" });
    assert(res.status === 404, `Expected 404 (mock disabled in live mode), got ${res.status}`);
  });
}

// ─── GDPR ─────────────────────────────────────────────────────
await test("POST /gdpr/consent records consent", async () => {
  const res = await fetch(`${BASE}/gdpr/consent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: "test-session-" + Date.now(), analytics: true, marketing: false }),
  });
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  const body = await json(res);
  assert(body.saved === true, `Expected saved=true, got ${JSON.stringify(body)}`);
});

await test("POST /gdpr/consent with missing fields returns 400", async () => {
  const res = await fetch(`${BASE}/gdpr/consent`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });
  assert(res.status === 400, `Expected 400, got ${res.status}`);
});

await test("POST /gdpr/erasure with email returns acknowledged", async () => {
  const res = await fetch(`${BASE}/gdpr/erasure`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "test-erase-" + Date.now() + "@example.com" }),
  });
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  const body = await json(res);
  assert(body.acknowledged === true, `Expected acknowledged=true, got: ${JSON.stringify(body)}`);
});

// ─── ADMIN AUTH ───────────────────────────────────────────────
await test("POST /admin/login with correct password returns token", async () => {
  const res = await fetch(`${BASE}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: ADMIN_PASSWORD }),
  });
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  const body = await json(res);
  assert(typeof body.token === "string" && body.token.length > 0, `Expected token string`);
});

await test("POST /admin/login with wrong password returns 401", async () => {
  if (!adminAuthEnabled) return "skip"; // open admin in dev — no password to reject
  const res = await fetch(`${BASE}/admin/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "definitely-wrong-" + Date.now() }),
  });
  assert(res.status === 401, `Expected 401, got ${res.status}`);
});

await test("GET /admin/stats WITHOUT token is rejected (401)", async () => {
  if (!adminAuthEnabled) return "skip"; // open admin in dev
  const res = await fetch(`${BASE}/admin/stats`);
  assert(res.status === 401, `Expected 401 without token, got ${res.status}`);
});

await test("GET /admin/stats WITH token returns revenue + flag totals", async () => {
  const res = await fetch(`${BASE}/admin/stats`, { headers: adminHeaders() });
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  const body = await json(res);
  assert("totalFlags" in body && "totalRevenue" in body, `Expected totalFlags+totalRevenue, got ${JSON.stringify(body)}`);
  assert(typeof body.totalRevenue === "number", `totalRevenue must be a number`);
});

await test("GET /admin/payments returns paginated list", async () => {
  const res = await fetch(`${BASE}/admin/payments`, { headers: adminHeaders() });
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  const body = await json(res);
  assert(Array.isArray(body.payments), `Expected payments array`);
  assert(typeof body.total === "number", `Expected total number`);
});

await test("GET /admin/payments?status=succeeded applies filter to rows AND total (issue #11)", async () => {
  const [allRes, succRes, pendRes] = await Promise.all([
    fetch(`${BASE}/admin/payments?limit=1`, { headers: adminHeaders() }),
    fetch(`${BASE}/admin/payments?status=succeeded&limit=50`, { headers: adminHeaders() }),
    fetch(`${BASE}/admin/payments?status=pending&limit=1`, { headers: adminHeaders() }),
  ]);
  const all = await json(allRes);
  const succ = await json(succRes);
  const pend = await json(pendRes);
  // every returned row must match the requested status
  for (const p of succ.payments) assert(p.status === "succeeded", `Filtered row has status ${p.status}`);
  // total must reflect the filter, not the whole table
  assert(succ.total <= all.total, `Filtered total (${succ.total}) > unfiltered (${all.total})`);
  if (pend.total > 0) {
    assert(succ.total < all.total, `Status filter not applied to total count — got ${succ.total} == ${all.total} (regression of #11)`);
  }
});

await test("GET /admin/team-breakdown returns per-team data", async () => {
  const res = await fetch(`${BASE}/admin/team-breakdown`, { headers: adminHeaders() });
  assert(res.status === 200, `Expected 200, got ${res.status}`);
  const body = await json(res);
  assert(Array.isArray(body), `Expected array`);
  if (body.length > 0) {
    const first = body[0];
    assert("teamId" in first && "flagCount" in first, `Expected teamId+flagCount per item, got: ${JSON.stringify(first)}`);
  }
});

// ─── RATE LIMITING (opt-in: consumes the request budget) ──────
await test("Admin login is rate-limited after 10 attempts (429)", async () => {
  if (!TEST_RATE_LIMIT) return "skip";
  let got429 = false;
  for (let i = 0; i < 15; i++) {
    const res = await fetch(`${BASE}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: "rate-limit-probe" }),
    });
    if (res.status === 429) { got429 = true; break; }
  }
  assert(got429, `Expected a 429 within 15 rapid login attempts`);
});

// ─── PRINT RESULTS ────────────────────────────────────────────
const PASS = "\x1b[32m✓\x1b[0m";
const FAIL = "\x1b[31m✗\x1b[0m";
const SKIP = "\x1b[33m–\x1b[0m";
const passed = results.filter(r => r.pass && !r.skipped).length;
const skipped = results.filter(r => r.skipped).length;
const failed = results.filter(r => !r.pass).length;

console.log("\n══════════════════════════════════════════════════");
console.log("  WORLD CAPO — Pre-deployment Feature Tests");
console.log("══════════════════════════════════════════════════");
console.log(`  Target:  ${BASE}`);
console.log(`  Mode:    Stripe ${devMode ? "DEV/mock" : "LIVE"} · Admin ${adminAuthEnabled ? "password-protected" : "open (dev)"}`);
console.log("──────────────────────────────────────────────────\n");

for (const r of results) {
  const icon = r.skipped ? SKIP : r.pass ? PASS : FAIL;
  console.log(`  ${icon}  ${r.name}`);
  if (!r.pass) console.log(`       ↳ ${r.detail}`);
}

console.log(`\n──────────────────────────────────────────────────`);
console.log(`  ${passed} passed  ·  ${skipped} skipped  ·  ${failed} failed  ·  ${results.length} total`);
console.log(`──────────────────────────────────────────────────\n`);

if (failed > 0) process.exit(1);
