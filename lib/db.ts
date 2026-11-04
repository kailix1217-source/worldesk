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
    // One row per Worldesk account, created on first sign-in. user_id is the Neon Auth user id.
    await sql`CREATE TABLE IF NOT EXISTS user_data (
      user_id TEXT PRIMARY KEY,
      created_day DATE NOT NULL DEFAULT (now() AT TIME ZONE 'America/Los_Angeles')::date,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      profile JSONB, saved JSONB, alerts JSONB
    )`;
    // The sample account's stories, searched once a day however many people view them.
    await sql`CREATE TABLE IF NOT EXISTS sample_cache (
      day DATE NOT NULL DEFAULT (now() AT TIME ZONE 'America/Los_Angeles')::date,
      key TEXT NOT NULL,
      payload JSONB NOT NULL,
      PRIMARY KEY (day, key)
    )`;
    await sql`ALTER TABLE survey_responses ADD COLUMN IF NOT EXISTS user_id TEXT`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS survey_responses_user ON survey_responses (user_id) WHERE user_id IS NOT NULL`;
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

// Counts one paid news search today for a key (an account, or a network for the sample) and returns the total.
export async function countBriefing(key: string) {
  await ensureSchema();
  const [{ n }] = (await sql`INSERT INTO briefing_usage (ip_hash, n) VALUES (${key}, 1)
    ON CONFLICT (ip_hash, day) DO UPDATE SET n = briefing_usage.n + 1
    RETURNING n`) as { n: number }[];
  return n;
}
