import { timingSafeEqual } from "crypto";
import { ensureSchema, sql } from "@/lib/db";
import { FEATURES, QUESTIONS, RATING_ROWS } from "@/lib/survey";

// CSV of all responses in the Microsoft Forms export's column order, so the two files merge in Excel.
// Ranking follows the Forms convention: feature labels joined by ";" in the order chosen.
// Usage: curl -H "Authorization: Bearer $ADMIN_TOKEN" https://worldesk.vercel.app/api/survey/export > responses.csv
// Add ?env=all to include development and preview test rows (production only by default).

type Row = Record<string, unknown> & { id: number; created_at: string; markets: string[] | null };

const authorized = (req: Request) => {
  const token = process.env.ADMIN_TOKEN;
  const got = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  return !!token && got.length === token.length && timingSafeEqual(Buffer.from(got), Buffer.from(token));
};

const cell = (v: unknown) => {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export async function GET(req: Request) {
  if (!authorized(req)) return new Response("Unauthorized", { status: 401 });
  await ensureSchema();
  const all = new URL(req.url).searchParams.get("env") === "all";
  const rows = (all
    ? await sql`SELECT * FROM survey_responses ORDER BY id`
    : await sql`SELECT * FROM survey_responses WHERE env = 'production' ORDER BY id`) as Row[];

  const header = [
    "ID", "Completion time", "Last modified time", "Channel",
    ...RATING_ROWS.map((r) => `${QUESTIONS.ratings}.${r.label}`),
    QUESTIONS.ranking, QUESTIONS.frequency, QUESTIONS.pay, QUESTIONS.idea, QUESTIONS.email,
    "Seconds to complete", "Device", "Sample account", "Environment", "Role", "Industry", "Markets",
  ];
  const lines = rows.map((r) => {
    const ranking = FEATURES.filter((f) => r[`rank_${f.key}`])
      .sort((a, b) => Number(r[`rank_${a.key}`]) - Number(r[`rank_${b.key}`]))
      .map((f) => f.label + ";").join("");
    return [
      r.id, new Date(r.created_at).toISOString(), r.updated_at ? new Date(String(r.updated_at)).toISOString() : "", r.channel,
      ...RATING_ROWS.map((x) => r[`r_${x.key}`]),
      ranking, r.frequency, r.willingness_to_pay, r.idea, r.email,
      r.seconds_to_complete, r.device, r.demo ? "Yes" : "No", r.env, r.func, r.industry, (r.markets ?? []).join("; "),
    ].map(cell).join(",");
  });
  const csv = "﻿" + [header.map(cell).join(","), ...lines].join("\r\n"); // BOM so Excel reads UTF-8
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="worldesk-survey-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
