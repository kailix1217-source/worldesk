import { NextResponse } from "next/server";
import { marketFor, outletForUrl } from "@/lib/sources";
import { sampleBriefing } from "@/lib/sample";
import type { Article, Briefing, Leg, Profile } from "@/lib/types";

export const maxDuration = 60;

const SCHEMA = {
  type: "object",
  properties: {
    landing_note: { type: "string" },
    articles: {
      type: "array",
      items: {
        type: "object",
        properties: {
          outlet: { type: "string" },
          original_headline: { type: "string" },
          english_headline: { type: "string" },
          date: { type: "string" },
          summary: { type: "string" },
          why_it_matters: { type: "string" },
          url: { type: "string" },
        },
        required: ["outlet", "original_headline", "english_headline", "date", "summary", "why_it_matters", "url"],
      },
    },
  },
  required: ["landing_note", "articles"],
};

type SearchResult = { url: string; title?: string; date?: string };

async function search(profile: Profile, leg: Leg, count: number, recency: "week" | "month") {
  const market = marketFor(leg.country)!;
  const outlets = market.outlets.map((o) => `${o.name} (${o.domain})`).join(", ");

  const system = `You are the foreign desk editor of Worldesk, a briefing service for international business executives.
You ONLY use articles published by these trusted ${market.country} outlets: ${outlets}.
Search in ${market.language}, the way a local reader would. Never invent articles, headlines or URLs: every url must be the exact article URL from your search results.
Prefer business, policy and industry news over general news. Skip opinion pieces, horoscopes, sports and celebrity news.`;

  const user = `Reader: ${profile.title || "executive"} in ${profile.func} at a ${profile.industry} company, based in ${profile.homeCountry || "abroad"}.
Topics they follow: ${profile.topics.join(", ") || "markets and economy"}.
Trip: ${leg.city}, ${leg.country}, ${leg.arrive} to ${leg.depart}.

Find up to ${count} recent stories from the outlets above that this reader should know before meetings in ${leg.city}. Rank by relevance to their industry and function.
For each: outlet name, the original ${market.language} headline, an accurate English translation, publication date (YYYY-MM-DD), a 2-sentence English summary that keeps the local framing and tone, and one sentence "why it matters" addressed to this reader (concrete: which conversation or decision it affects).
landing_note: one sentence on the overall business mood in ${leg.city} this week, based only on these stories.`;

  const res = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "sonar",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      search_domain_filter: market.outlets.map((o) => o.domain),
      search_recency_filter: recency,
      response_format: { type: "json_schema", json_schema: { schema: SCHEMA } },
      temperature: 0.2,
    }),
  });
  if (!res.ok) throw new Error(`Perplexity ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const parsed = JSON.parse(data.choices[0].message.content) as { landing_note: string; articles: Article[] };
  const results: SearchResult[] = data.search_results ?? (data.citations ?? []).map((url: string) => ({ url }));
  return { parsed, results, market };
}

function clean(parsed: { articles: Article[] }, results: SearchResult[], market: NonNullable<ReturnType<typeof marketFor>>) {
  const found = new Set(results.map((r) => r.url.replace(/\/$/, "")));
  const seen = new Set<string>();
  const out: Article[] = [];
  for (const a of parsed.articles ?? []) {
    const outlet = outletForUrl(a.url, market);
    if (!outlet) continue; // trust rule: only whitelisted domains
    const key = a.url.replace(/\/$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    // Drop bare home/section pages: an article URL has a meaningful path
    if (new URL(a.url).pathname.split("/").filter(Boolean).length < 1) continue;
    out.push({ ...a, outlet: outlet.name, verified: found.has(key) });
  }
  // Prefer stories the search engine actually returned; keep unverified only as filler
  out.sort((x, y) => Number(y.verified) - Number(x.verified));
  const verified = out.filter((a) => a.verified);
  return verified.length >= 3 ? verified : out;
}

export async function POST(req: Request) {
  const { profile, leg, count = 5 } = (await req.json()) as { profile: Profile; leg: Leg; count?: number };
  if (!marketFor(leg.country)) {
    return NextResponse.json({ error: `${leg.country} is not a covered market yet` }, { status: 400 });
  }
  if (!process.env.PERPLEXITY_API_KEY) {
    return NextResponse.json(sampleBriefing(profile, leg, count));
  }
  try {
    let { parsed, results, market } = await search(profile, leg, count, "week");
    let articles = clean(parsed, results, market);
    if (articles.length < 3) {
      ({ parsed, results, market } = await search(profile, leg, count, "month"));
      articles = clean(parsed, results, market);
    }
    const briefing: Briefing = { landing_note: parsed.landing_note, articles: articles.slice(0, count), source: "live" };
    return NextResponse.json(briefing);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
