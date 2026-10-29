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
    await sql`CREATE TABLE IF NOT EXISTS survey_events (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      env TEXT NOT NULL,
      session_id TEXT,
      type TEXT NOT NULL,
      step SMALLINT
    )`;
  })().catch((e) => { ready = null; throw e; });
  return ready;
}

// Rate limiting needs to recognise a repeat sender without storing their IP address.
export function ipHash(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
  return createHash("sha256").update(`${ip}|${process.env.ADMIN_TOKEN ?? ""}`).digest("hex").slice(0, 16);
}
