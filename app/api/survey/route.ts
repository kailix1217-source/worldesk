import { NextResponse } from "next/server";
import { ENV, ensureSchema, ipHash, sql } from "@/lib/db";
import { parseSubmission } from "@/lib/survey";

const DAILY_LIMIT = 5; // submissions per sender per day

export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }
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

    const rank = (k: string) => s.ranking.indexOf(k as never) + 1;
    await sql`INSERT INTO survey_responses (
      env, session_id,
      r_overall, r_briefing, r_article, r_relevance, r_indicators, r_ease, r_design,
      rank_markets, rank_trends, rank_language, rank_alerts, rank_audio, rank_trips,
      frequency, willingness_to_pay, idea, email,
      seconds_to_complete, device, demo, profile_shared, func, industry, markets, ip_hash
    ) VALUES (
      ${ENV}, ${s.session || null},
      ${s.ratings.overall}, ${s.ratings.briefing}, ${s.ratings.article}, ${s.ratings.relevance},
      ${s.ratings.indicators}, ${s.ratings.ease}, ${s.ratings.design},
      ${rank("markets")}, ${rank("trends")}, ${rank("language")}, ${rank("alerts")}, ${rank("audio")}, ${rank("trips")},
      ${s.frequency}, ${s.pay}, ${s.idea || null}, ${s.email || null},
      ${s.seconds}, ${s.device}, ${s.demo}, ${s.shareProfile},
      ${s.profile?.func || null}, ${s.profile?.industry || null}, ${s.profile?.markets ?? null}, ${ip}
    )`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("survey insert failed", (e as Error).message);
    return NextResponse.json({ error: "We couldn't save your answers. Please try again." }, { status: 500 });
  }
}
