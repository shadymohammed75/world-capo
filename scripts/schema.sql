-- World Capo database schema.
-- Run this ONCE against your production database (e.g. paste into Neon's SQL
-- editor) to create the tables before the app starts. Matches the Drizzle
-- schema in lib/db/src/schema. Safe to re-run (IF NOT EXISTS).

CREATE TABLE IF NOT EXISTS flags (
  id          serial PRIMARY KEY,
  team_id     text NOT NULL,
  x           real NOT NULL,
  y           real NOT NULL,
  payment_id  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS flags_team_id_idx    ON flags (team_id);
CREATE INDEX IF NOT EXISTS flags_created_at_idx ON flags (created_at);

CREATE TABLE IF NOT EXISTS payments (
  id                        serial PRIMARY KEY,
  stripe_payment_intent_id  text NOT NULL UNIQUE,
  amount_cents              integer NOT NULL,
  currency                  text NOT NULL DEFAULT 'eur',
  status                    text NOT NULL DEFAULT 'pending',
  team_id                   text NOT NULL,
  flag_x                    real,
  flag_y                    real,
  email_hash                text,
  ip_hash                   text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_status_idx     ON payments (status);
CREATE INDEX IF NOT EXISTS payments_created_at_idx ON payments (created_at);

CREATE TABLE IF NOT EXISTS gdpr_consents (
  id            serial PRIMARY KEY,
  session_id    text NOT NULL,
  ip_hash       text,
  analytics     boolean NOT NULL DEFAULT false,
  marketing     boolean NOT NULL DEFAULT false,
  consented_at  timestamptz NOT NULL DEFAULT now()
);
