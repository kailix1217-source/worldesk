import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/server";
import { ensureSchema, sql } from "@/lib/db";

const NEW_ACCOUNTS_PER_DAY = 50;
const MAX_BYTES = 500_000; // profile plus saved stories, per save

type Row = { profile: unknown; saved: unknown; alerts: unknown };

// Called after every sign-in: returns the reader's data, creating their Worldesk account on the first visit.
// The daily cap lives here so it holds whichever sign-in method created the login.
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const b = (await req.json().catch(() => ({}))) as { profile?: unknown; saved?: unknown; alerts?: unknown };
  try {
    await ensureSchema();
    let [row] = (await sql`SELECT profile, saved, alerts FROM user_data WHERE user_id = ${user.id}`) as Row[];
    let created = false;
    if (!row) {
      [row] = (await sql`INSERT INTO user_data (user_id, profile, saved, alerts)
        SELECT ${user.id}, ${JSON.stringify(b.profile ?? null)}::jsonb, ${JSON.stringify(b.saved ?? null)}::jsonb, ${JSON.stringify(b.alerts ?? null)}::jsonb
        WHERE (SELECT count(*) FROM user_data WHERE created_day = (now() AT TIME ZONE 'America/Los_Angeles')::date) < ${NEW_ACCOUNTS_PER_DAY}
        ON CONFLICT (user_id) DO NOTHING
        RETURNING profile, saved, alerts`) as Row[];
      created = !!row;
      // Nothing inserted means the cap is reached, or another request just created this account (a second tab, say).
      if (!row) [row] = (await sql`SELECT profile, saved, alerts FROM user_data WHERE user_id = ${user.id}`) as Row[];
      if (!row) return NextResponse.json({ error: "Worldesk has reached today's limit for new accounts. Please try again tomorrow." }, { status: 403 });
    }
    return NextResponse.json({ ...row, created });
  } catch (e) {
    console.error("account load failed", (e as Error).message);
    return NextResponse.json({ error: "We couldn't open your account. Please try again." }, { status: 500 });
  }
}

// Saves whichever of profile, saved stories and alert settings changed.
export async function PUT(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const text = await req.text();
  if (text.length > MAX_BYTES) return NextResponse.json({ error: "Too much to save." }, { status: 413 });
  let b: { profile?: unknown; saved?: unknown; alerts?: unknown };
  try { b = JSON.parse(text); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const json = (v: unknown) => (v === undefined ? null : JSON.stringify(v));
  try {
    await ensureSchema();
    await sql`UPDATE user_data SET
      profile = COALESCE(${json(b.profile)}::jsonb, profile),
      saved = COALESCE(${json(b.saved)}::jsonb, saved),
      alerts = COALESCE(${json(b.alerts)}::jsonb, alerts),
      updated_at = now()
      WHERE user_id = ${user.id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("account save failed", (e as Error).message);
    return NextResponse.json({ error: "We couldn't save your changes." }, { status: 500 });
  }
}
