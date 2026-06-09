import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Most managed Postgres providers (Neon, Supabase, RDS, Heroku, ...) require
// TLS. Enable it with DATABASE_SSL=true, or include sslmode=require in the URL.
// rejectUnauthorized:false accepts the provider's managed certificate chain.
const useSsl =
  process.env.DATABASE_SSL === "true" ||
  /[?&]sslmode=require/.test(process.env.DATABASE_URL);

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
});
export const db = drizzle(pool, { schema });

export * from "./schema";
