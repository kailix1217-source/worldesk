import { neon } from "@neondatabase/serverless";
import { createHash } from "crypto";

// Neon Postgres (Vercel Marketplace). DATABASE_URL is set by the integration in every environment.
export const sql = neon(process.env.DATABASE_URL ?? "postgres://missing");

// Development and preview share the database with production, so every row records where it came from.
export const ENV = process.env.VERCEL_ENV ?? "development";

// One flat row per response: a column per rating row and per feature rank, ready to chart.
let ready: Promise<unknown> | null = null;
export function ensureSchema() {
  ready ??= (async () => {
    await sql`CREATE TABLE IF NOT EXISTS survey_responses (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      env TEXT NOT NULL,
      channel TEXT NOT NULL DEFAULT 'in-app',
      session_id TEXT,
      r_overall SMALLINT, r_briefing SMALLINT, r_article SMALLINT, r_relevance SMALLINT,
      r_indicators SMALLINT, r_ease SMALLINT, r_design SMALLINT,
      rank_markets SMALLINT, rank_trends SMALLINT, rank_language SMALLINT,
      rank_alerts SMALLINT, rank_audio SMALLINT, rank_trips SMALLINT,
      frequency TEXT, willingness_to_pay TEXT, idea TEXT, email TEXT,
      seconds_to_complete INT, device TEXT, demo BOOLEAN NOT NULL DEFAULT false,
      profile_shared BOOLEAN NOT NULL DEFAULT false, func TEXT, industry TEXT, markets TEXT[],
      ip_hash TEXT
    )`;
    // Readers can edit their answers later from the same browser; the row keeps a hash of their edit token.
    await sql`ALTER TABLE survey_responses
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS edit_count INT NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS edit_hash TEXT`;
    await sql`CREATE TABLE IF NOT EXISTS survey_events (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      env TEXT NOT NULL,
      session_id TEXT,
      type TEXT NOT NULL,
      step SMALLINT
    )`;
    await sql`CREATE TABLE IF NOT EXISTS briefing_usage (
      ip_hash TEXT NOT NULL,
      day DATE NOT NULL DEFAULT current_date,
      n INT NOT NULL DEFAULT 0,
      PRIMARY KEY (ip_hash, day)
    )`;
  })().catch((e) => { ready = null; throw e; });
  return ready;
}

export const tokenHash = (token: string) => createHash("sha256").update(token).digest("hex");

// Rate limiting needs to recognise a repeat sender without storing their IP address.
export function ipHash(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  return createHash("sha256").update(`${ip}|${process.env.ADMIN_TOKEN ?? ""}`).digest("hex").slice(0, 16);
}

// Counts one paid news search for this sender today and returns the running total.
export async function countBriefing(req: Request) {
  await ensureSchema();
  const [{ n }] = (await sql`INSERT INTO briefing_usage (ip_hash, n) VALUES (${ipHash(req)}, 1)
    ON CONFLICT (ip_hash, day) DO UPDATE SET n = briefing_usage.n + 1
    RETURNING n`) as { n: number }[];
  return n;
}
