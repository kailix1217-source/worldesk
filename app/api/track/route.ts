import { NextResponse } from "next/server";
import { currentUser } from "@/lib/auth/server";
import { ENV, ensureSchema, sql } from "@/lib/db";

// Usage events from signed-in readers. The user ID comes from the session, never from the browser.
const TYPES = new Set([
  "signed_in", "step_complete", "onboarding_complete", "briefing_open", "stories_loaded", "active_time",
  "story_open", "source_click", "story_save", "story_unsave", "topic_filter", "market_switch", "view_open",
  "load_more", "refresh", "alerts_change", "feedback_open", "logout",
]);
const PROP_KEYS = new Set(["market", "topic", "outlet", "step", "via", "view", "seconds", "loaded", "created", "on"]);
const MAX_EVENTS = 50;
const DAY_MS = 86_400_000;

function cleanProps(p: unknown) {
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries((p ?? {}) as Record<string, unknown>)) {
    if (!PROP_KEYS.has(k)) continue;
    if (typeof v === "string") out[k] = v.slice(0, 60);
    else if (typeof v === "number" && Number.isFinite(v)) out[k] = Math.max(0, Math.min(86_400, Math.round(v)));
    else if (typeof v === "boolean") out[k] = v;
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ ok: false });
    const b = (await req.json()) as { session?: unknown; events?: unknown };
    const session = typeof b.session === "string" ? b.session.slice(0, 64) : "";
    const now = Date.now();
    const events = (Array.isArray(b.events) ? b.events : []).slice(0, MAX_EVENTS).flatMap((e: { type?: unknown; at?: unknown; props?: unknown }) => {
      if (typeof e?.type !== "string" || !TYPES.has(e.type)) return [];
      const t = Date.parse(String(e.at));
      return [{ type: e.type, at: new Date(Number.isNaN(t) || Math.abs(now - t) > DAY_MS ? now : t).toISOString(), props: cleanProps(e.props) }];
    });
    if (!events.length) return NextResponse.json({ ok: true });
    await ensureSchema();
    await sql`INSERT INTO usage_events (env, user_id, session_id, type, client_at, props)
      SELECT ${ENV}, ${user.id}, ${session}, e->>'type', (e->>'at')::timestamptz, e->'props'
      FROM jsonb_array_elements(${JSON.stringify(events)}::jsonb) e
      WHERE EXISTS (SELECT 1 FROM user_data WHERE user_id = ${user.id})`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("track failed", (e as Error).message);
    return NextResponse.json({ ok: false }); // analytics must never bother the reader
  }
}
