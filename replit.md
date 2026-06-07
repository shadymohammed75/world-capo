# World Capo

FIFA World Cup 2026 fan wall — users pay €0.70 to place their nation's flag on a live global board.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/world-capo run dev` — run the frontend (port 24560)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, Tailwind CSS, shadcn/ui, Framer Motion, Recharts, wouter
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Payments: Stripe (keys pending)
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — API contract (source of truth)
- `lib/db/src/schema/` — DB tables: `flags`, `payments`, `gdpr_consents`
- `artifacts/api-server/src/routes/` — flags, payments, admin, gdpr routes
- `artifacts/world-capo/src/pages/` — Home (fan wall), Checkout, Admin
- `artifacts/world-capo/src/lib/teams.ts` — 48 nations data

## Architecture decisions

- Firebase replaced entirely with PostgreSQL + Express API
- Stripe PaymentIntent flow: frontend creates intent → user pays → webhook confirms → flag placed
- In dev mode (no `STRIPE_SECRET_KEY`), mock payment intents are created and `/api/payments/confirm-mock/:id` simulates success
- All PII (email, IP) is SHA-256 hashed before storage — never stored in plaintext (GDPR)
- GDPR consent recorded per session; right-to-erasure anonymises email hashes in payments table
- Admin dashboard password: `worldcapo2026` (stored in sessionStorage)

## Product

- **Fan Wall** (`/`) — live leaderboard of 48 nations, draggable 2500×1500 canvas with placed flags, "Hang Flag" CTA per team, GDPR cookie consent banner
- **Checkout** (`/checkout/:teamId`) — flag placement preview, payment form (Stripe-ready), simulated success flow
- **Admin Dashboard** (`/admin`) — password-gated, shows total revenue, flag counts, payment table, team breakdown charts

## To go live

### 1. Stripe

Set these environment secrets:
- `STRIPE_SECRET_KEY` — from Stripe Dashboard → Developers → API keys
- `STRIPE_WEBHOOK_SECRET` — from Stripe Dashboard → Webhooks → add endpoint `/api/payments/webhook`

Then install `@stripe/react-stripe-js` and `@stripe/stripe-js` in the frontend and replace the card form in `Checkout.tsx` with Stripe's `PaymentElement` component.

### 2. Domain

After publishing on Replit, your app gets a `.replit.app` domain automatically. To use a custom domain:
1. Publish the app (click the Deploy button)
2. Go to the Deployment settings → Custom Domain
3. Add your domain and update your DNS to point to Replit's servers

### 3. Hosting

Replit Deployments handles everything: HTTPS, auto-scaling, zero-downtime deploys. No extra infrastructure needed.

## GDPR compliance implemented

- Cookie consent banner on first visit (Essential Only vs Accept All)
- All IPs and emails stored as SHA-256 hashes
- Right-to-erasure endpoint (`POST /api/gdpr/erasure`) anonymises payment records
- No PII stored in plaintext — only hashed identifiers
- Flags contain only coordinates and teamId — no user data

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- Always run codegen after OpenAPI spec changes: `pnpm --filter @workspace/api-spec run codegen`
- Always run `pnpm --filter @workspace/db run push` after schema changes
- Stripe webhook must receive raw body — the `rawBodyMiddleware` in `payments.ts` handles this
- In dev mode without `STRIPE_SECRET_KEY`, use `POST /api/payments/confirm-mock/:intentId` to simulate payment success

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
