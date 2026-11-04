import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/server";
import { ENV, ensureSchema, sql } from "@/lib/db";
import { EVENT_TYPES } from "@/lib/survey";

// Funnel events (invitation shown, started, reached step n…) so we can see where readers drop off.
// Signed-in readers are recorded by user ID, taken from the session; the sample account stays anonymous.
export async function POST(req: Request) {
  try {
    const b = (await req.json()) as { type?: string; step?: number; session?: string; demo?: boolean };
    if (!EVENT_TYPES.includes(b.type as never)) return NextResponse.json({ error: "Unknown event" }, { status: 400 });
    const step = Number.isInteger(b.step) && b.step! >= 0 && b.step! < 10 ? b.step! : null;
    const session = typeof b.session === "string" ? b.session.slice(0, 64) : null;
    const user = b.demo === false ? await currentUser() : null;
    await ensureSchema();
    await sql`INSERT INTO survey_events (env, session_id, user_id, type, step) VALUES (${ENV}, ${session}, ${user?.id ?? null}, ${b.type}, ${step})`;
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200 }); // analytics must never bother the reader
  }
}
