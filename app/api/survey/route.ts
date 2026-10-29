import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { ENV, ensureSchema, ipHash, sql, tokenHash } from "@/lib/db";
import { parseSubmission } from "@/lib/survey";

const DAILY_LIMIT = 5; // submissions per sender per day
const MAX_EDITS = 20; // per response

async function readBody(req: Request) {
  try { return (await req.json()) as Record<string, unknown>; } catch { return null; }
}

export async function POST(req: Request) {
  const body = await readBody(req);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const parsed = parseSubmission(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const s = parsed.value;
  if (s.website) return NextResponse.json({ ok: true }); // spam trap filled: accept quietly, store nothing

  try {
    await ensureSchema();
    const ip = ipHash(req);
    const [{ n }] = (await sql`SELECT count(*)::int AS n FROM survey_responses
      WHERE ip_hash = ${ip} AND created_at > now() - interval '1 day'`) as { n: number }[];
    if (n >= DAILY_LIMIT) return NextResponse.json({ error: "Thanks, we already have your answers for today." }, { status: 429 });

    // The browser keeps this token so the reader can edit the same response later; we store only its hash.
    const token = randomBytes(16).toString("hex");
    const rank = (k: string) => s.ranking.indexOf(k as never) + 1;
    const [{ id }] = (await sql`INSERT INTO survey_responses (
      env, session_id,
      r_overall, r_briefing, r_article, r_relevance, r_indicators, r_ease, r_design,
      rank_markets, rank_trends, rank_language, rank_alerts, rank_audio, rank_trips,
      frequency, willingness_to_pay, idea, email,
      seconds_to_complete, device, demo, profile_shared, func, industry, markets, ip_hash, edit_hash
    ) VALUES (
      ${ENV}, ${s.session || null},
      ${s.ratings.overall}, ${s.ratings.briefing}, ${s.ratings.article}, ${s.ratings.relevance},
      ${s.ratings.indicators}, ${s.ratings.ease}, ${s.ratings.design},
      ${rank("markets")}, ${rank("trends")}, ${rank("language")}, ${rank("alerts")}, ${rank("audio")}, ${rank("trips")},
      ${s.frequency}, ${s.pay}, ${s.idea || null}, ${s.email || null},
      ${s.seconds}, ${s.device}, ${s.demo}, ${s.shareProfile},
      ${s.profile?.func || null}, ${s.profile?.industry || null}, ${s.profile?.markets ?? null}, ${ip}, ${tokenHash(token)}
    ) RETURNING id`) as { id: number }[];
    return NextResponse.json({ ok: true, id, token });
  } catch (e) {
    console.error("survey insert failed", (e as Error).message);
    return NextResponse.json({ error: "We couldn't save your answers. Please try again." }, { status: 500 });
  }
}

// Edit an earlier response. Overwrites the answers in place; completion time, timing and device stay as first sent.
export async function PUT(req: Request) {
  const body = await readBody(req);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const id = Number(body.id), token = typeof body.token === "string" ? body.token : "";
  if (!Number.isInteger(id) || !token) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const parsed = parseSubmission(body);
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const s = parsed.value;

  try {
    await ensureSchema();
    const rank = (k: string) => s.ranking.indexOf(k as never) + 1;
    const rows = await sql`UPDATE survey_responses SET
      r_overall = ${s.ratings.overall}, r_briefing = ${s.ratings.briefing}, r_article = ${s.ratings.article},
      r_relevance = ${s.ratings.relevance}, r_indicators = ${s.ratings.indicators}, r_ease = ${s.ratings.ease}, r_design = ${s.ratings.design},
      rank_markets = ${rank("markets")}, rank_trends = ${rank("trends")}, rank_language = ${rank("language")},
      rank_alerts = ${rank("alerts")}, rank_audio = ${rank("audio")}, rank_trips = ${rank("trips")},
      frequency = ${s.frequency}, willingness_to_pay = ${s.pay}, idea = ${s.idea || null}, email = ${s.email || null},
      profile_shared = ${s.shareProfile}, func = ${s.profile?.func || null}, industry = ${s.profile?.industry || null},
      markets = ${s.profile?.markets ?? null},
      updated_at = now(), edit_count = edit_count + 1
      WHERE id = ${id} AND edit_hash = ${tokenHash(token)} AND edit_count < ${MAX_EDITS}
      RETURNING id`;
    if (!rows.length) return NextResponse.json({ error: "We couldn't find your earlier answers to update." }, { status: 404 });
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    console.error("survey update failed", (e as Error).message);
    return NextResponse.json({ error: "We couldn't save your changes. Please try again." }, { status: 500 });
  }
}
