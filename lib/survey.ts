// In-app version of the "User Feedback on Worldesk" Microsoft Form. Wording and option order
// follow the form so the two exports line up; the form's "Custom keywords and search" feature
// is left out here because Worldesk already has it (it stays a form-only column in the export).

export const RATING_ROWS = [
  { key: "overall", label: "Worldesk overall" },
  { key: "briefing", label: "Quality of the briefing summaries" },
  { key: "article", label: "Quality of the article summaries" },
  { key: "relevance", label: "Relevance of briefing and article summaries to the markets and topics I follow" },
  { key: "indicators", label: "Country economic indicators" },
  { key: "ease", label: "Ease of setup and navigation" },
  { key: "design", label: "Visual design and layout" },
] as const;

export const FEATURES = [
  { key: "markets", label: "More markets and multi-select filters (e.g., Colombia, Indonesia, Taiwan)" },
  { key: "trends", label: "Trend charts for economic indicators (see how GDP, inflation, or interest rates have moved)" },
  { key: "language", label: "Briefings in your preferred language (e.g., Spanish, Korean, Japanese)" },
  { key: "alerts", label: "Email digest and real-time alerts" },
  { key: "audio", label: "Audio briefing for your commute" },
  { key: "trips", label: "Trip planner (conferences, trade shows, and events during your travel dates)" },
] as const;

export const FREQUENCY = ["Daily", "A few times a week", "Weekly", "Occasionally", "I would not use it"] as const;
export const PAY = ["$20.00 or more", "$15.00 to $19.99", "$10.00 to $14.99", "$5.00 to $9.99", "Under $5.00", "I would not pay for it"] as const;

export const QUESTIONS = {
  ratings: "How would you rate Worldesk overall, and each part of it?",
  ranking: "Which new features would you most like to see? Rank them in order of importance.",
  frequency: "Would you use Worldesk? If so, how often?",
  pay: "How much would you be willing to pay for Worldesk per user, per month?",
  idea: "What would make Worldesk more useful for you?",
  email: "Please provide your email address (optional) if you're open to a short follow-up conversation about Worldesk.",
};

export const IDEA_MAX = 1000;
export const EVENT_TYPES = ["invite_shown", "later", "started", "step", "minimized"] as const;

export type RatingKey = (typeof RATING_ROWS)[number]["key"];
export type FeatureKey = (typeof FEATURES)[number]["key"];

export type SurveyAnswers = {
  ratings: Partial<Record<RatingKey, number>>;
  ranking: FeatureKey[]; // most wanted first
  frequency: string;
  pay: string;
  idea: string;
  email: string;
  shareProfile: boolean;
};

export type SurveySubmission = SurveyAnswers & {
  session: string;
  seconds: number;
  device: "desktop" | "mobile";
  demo: boolean;
  profile?: { func: string; industry: string; markets: string[] };
  website?: string; // spam trap: real readers never see or fill it
};

export const EMPTY_ANSWERS: SurveyAnswers = { ratings: {}, ranking: [], frequency: "", pay: "", idea: "", email: "", shareProfile: false };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const validEmail = (e: string) => !e.trim() || (e.trim().length <= 200 && EMAIL.test(e.trim()));

// Required exactly as on the form: every rating row, the full ranking, frequency and price.
export const stepComplete = (step: number, a: SurveyAnswers) =>
  step === 0 ? RATING_ROWS.every((r) => a.ratings[r.key]) :
  step === 1 ? a.ranking.length === FEATURES.length :
  step === 2 ? !!a.frequency :
  step === 3 ? !!a.pay :
  validEmail(a.email);

const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

// Server-side check of everything the browser sends; returns a clean copy or the first problem.
export function parseSubmission(b: Record<string, unknown>): { ok: true; value: SurveySubmission } | { ok: false; error: string } {
  const r = (b.ratings ?? {}) as Record<string, unknown>;
  const ratings: Partial<Record<RatingKey, number>> = {};
  for (const row of RATING_ROWS) {
    const v = r[row.key];
    if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 5) return { ok: false, error: `Missing rating: ${row.label}` };
    ratings[row.key] = v;
  }
  const keys = FEATURES.map((f) => f.key) as string[];
  const ranking = Array.isArray(b.ranking) ? (b.ranking as unknown[]) : [];
  if (ranking.length !== keys.length || new Set(ranking).size !== keys.length || !ranking.every((k) => keys.includes(k as string)))
    return { ok: false, error: "Ranking must order every feature once" };
  const frequency = str(b.frequency, 60), pay = str(b.pay, 60);
  if (!(FREQUENCY as readonly string[]).includes(frequency)) return { ok: false, error: "Pick how often you'd use Worldesk" };
  if (!(PAY as readonly string[]).includes(pay)) return { ok: false, error: "Pick what you'd pay" };
  const email = str(b.email, 200);
  if (!validEmail(email)) return { ok: false, error: "That email address doesn't look right" };
  const p = b.profile as Record<string, unknown> | undefined;
  const profile = b.shareProfile === true && p
    ? { func: str(p.func, 80), industry: str(p.industry, 80), markets: (Array.isArray(p.markets) ? p.markets : []).slice(0, 20).map((m) => str(m, 40)) }
    : undefined;
  return {
    ok: true,
    value: {
      ratings, ranking: ranking as FeatureKey[], frequency, pay, email,
      idea: str(b.idea, IDEA_MAX),
      shareProfile: !!profile, profile,
      session: str(b.session, 64),
      seconds: Math.max(0, Math.min(86400, Math.round(Number(b.seconds) || 0))),
      device: b.device === "mobile" ? "mobile" : "desktop",
      demo: b.demo === true,
      website: str(b.website, 200),
    },
  };
}
