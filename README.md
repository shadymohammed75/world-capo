# World Capo

FIFA World Cup 2026 fan wall — users pay €0.70 to place their nation's flag on a live global board.

## Stack

- pnpm workspaces monorepo, Node.js 24, TypeScript 5.9
- **Frontend:** React + Vite, Tailwind CSS, shadcn/ui, Framer Motion, Recharts, wouter
- **API:** Express 5 (helmet, CORS, rate limiting, structured logging via pino)
- **DB:** PostgreSQL + Drizzle ORM
- **Payments:** Stripe (PaymentElement + Express Checkout for Apple Pay / Google Pay)
- **Validation:** Zod (`zod/v4`), `drizzle-zod`
- **API codegen:** Orval (from OpenAPI spec)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — DB tables: `flags`, `payments`, `gdpr_consents`
- `artifacts/api-server/src/routes/` — flags, payments, admin, gdpr routes
- `artifacts/world-capo/src/pages/` — Home (fan wall), Checkout, Admin
- `artifacts/world-capo/src/lib/teams.ts` — 48 nations data

## Local development

### 1. Environment files

`artifacts/api-server/.env`:

```
PORT=3000
NODE_ENV=development
LOG_LEVEL=info
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/worldcapo
ADMIN_PASSWORD=admin
FREE_MODE=true                            # no-payment launch; set false to enable paid checkout
# ALLOWED_ORIGIN=https://yourdomain.com   # production only
# DATABASE_SSL=true                       # managed Postgres that requires TLS
# TRUST_PROXY=1                           # hops when behind a reverse proxy / LB
# STRIPE_SECRET_KEY=sk_test_...
# STRIPE_PUBLISHABLE_KEY=pk_test_...
# STRIPE_WEBHOOK_SECRET=whsec_...
```

`artifacts/world-capo/.env`:

```
PORT=5173
BASE_PATH=/
NODE_ENV=development
```

### 2. Database

Create the database and push the schema:

```
createdb worldcapo
pnpm --filter @workspace/db run push
```

### 3. Run

- API:      `pnpm --filter @workspace/api-server run dev`
- Frontend: `pnpm --filter @workspace/world-capo run dev`

The frontend proxies `/api` → `http://localhost:3000` (see `vite.config.ts`).

> **Windows note:** `pnpm-workspace.yaml` `overrides` exclude all non-Linux native
> binaries (the project targets a Linux production host). On Windows you must install
> the matching native binaries for `esbuild`, `rollup`, `lightningcss`, and
> `@tailwindcss/oxide` into the pnpm store manually, or remove those `overrides`
> entries and reinstall.

## Useful commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks + Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes

## Pre-deployment test procedure

`scripts/src/test-api.ts` is a black-box smoke test that checks every feature
against a **running** API server: health, security headers, flags, payments,
GDPR, and admin (login + token auth). It auto-detects dev vs live Stripe mode
and open vs password-protected admin, so it is safe to run against local dev or
production.

```bash
# 1. Start the API server first (see "Run" above), then:

# local dev (API on :3000, ADMIN_PASSWORD=admin)
pnpm --filter @workspace/scripts run test-api

# against production
API_URL=https://yourdomain.com/api ADMIN_PASSWORD=yourpass \
  pnpm --filter @workspace/scripts run test-api

# also exercise the rate limiters (consumes the request budget)
TEST_RATE_LIMIT=1 pnpm --filter @workspace/scripts run test-api
```

Exits non-zero if any test fails, so it can gate a deploy. The mock-payment
tests only run in dev mode; in live mode they assert the mock endpoint is
disabled instead of writing to the database.

## Launch modes

The app supports a **free-launch mode** controlled by the `FREE_MODE` env var:

- **`FREE_MODE=true`** — flags are placed without payment. The checkout shows a
  "Place Your Flag — Free" button (via `POST /api/flags`), and the paid Stripe UI
  is hidden. The payment code is fully retained, just bypassed.
- **`FREE_MODE=false`** (or unset) — normal paid checkout (€0.70 via Stripe). The
  free `POST /api/flags` endpoint returns 404 so flags can't be placed for free.

Switching is a one-line env change with no redeploy of code logic.

## Architecture & security

- Stripe PaymentIntent flow: frontend creates intent on **"Continue to Payment"** → user pays → webhook confirms → flag placed
- Flag price is **fixed server-side** (`FLAG_PRICE_CENTS`); the client cannot set the amount
- Stripe webhook signatures are verified; flag placement is **idempotent** (a duplicate webhook cannot create a duplicate flag)
- In dev mode (no `STRIPE_SECRET_KEY`), mock payment intents are created and `POST /api/payments/confirm-mock/:id` simulates success. This endpoint is **disabled** once `STRIPE_SECRET_KEY` is set.
- Admin password is validated **server-side** against `ADMIN_PASSWORD`; the admin data routes and login are rate-limited
- All PII (email, IP) is **SHA-256 hashed** before storage — never stored in plaintext
- `helmet` sets security headers; CORS is restricted to `ALLOWED_ORIGIN` in production

## Going live

1. **Stripe** — set `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, and `STRIPE_WEBHOOK_SECRET` (all three together). Register a webhook endpoint at `/api/payments/webhook` for `payment_intent.succeeded` and `payment_intent.payment_failed`.
2. **Apple Pay / Google Pay** — enable the wallets in the Stripe Dashboard, register your domain for Apple Pay, and serve over HTTPS.
3. **Security** — set a strong `ADMIN_PASSWORD` and `ALLOWED_ORIGIN=https://yourdomain.com`.
4. **Build & serve** — `pnpm run build`, then run the API (`node ./dist/index.mjs`) and serve the frontend's `dist/public` behind your reverse proxy / host.

## Deploy to production (Render + Neon, free)

The app deploys as **one** Render web service: the Express API serves the built
React frontend, so everything runs on a single domain (no CORS, no separate
static host). PostgreSQL is hosted free on Neon. See [render.yaml](render.yaml).

1. **Database (Neon)** — create a free project at neon.tech, open the SQL editor,
   and run [scripts/schema.sql](scripts/schema.sql) to create the tables. Copy the
   **pooled** connection string.
2. **App (Render)** — Dashboard → New → Blueprint → connect this repo. Render reads
   `render.yaml`. When prompted, set the secret env vars:
   - `DATABASE_URL` = the Neon pooled connection string
   - `ADMIN_PASSWORD` = a strong password for `/admin`
   (`NODE_ENV`, `FREE_MODE`, `TRUST_PROXY`, `DATABASE_SSL` are preset in the blueprint.)
3. **Custom domain** — in the Render service → Settings → Custom Domains, add
   `worldcapo.world` (and `www.worldcapo.world`), then add the DNS records Render
   shows at your registrar. HTTPS is issued automatically.
4. **(Optional) demo flags** — paste the `INSERT` from [scripts/seed-flags.sql](scripts/seed-flags.sql)
   into Neon's SQL editor (replace `:n` with `300`) to launch with an active-looking wall.

To switch from free to paid later, set `FREE_MODE=false` and add the Stripe env
vars in the Render dashboard (see "Going live" below) — no redeploy of code needed.

## GDPR

- Cookie consent banner on first visit (Essential Only vs Accept All)
- All IPs and emails stored as SHA-256 hashes; no plaintext PII
- Right-to-erasure endpoint (`POST /api/gdpr/erasure`) anonymises payment records
- Flags contain only coordinates and `teamId` — no user data
