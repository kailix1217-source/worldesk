import { NextResponse } from "next/server";
import { domainsOf, isEnglishEdition, marketFor, outletForUrl } from "@/lib/sources";
import { sampleBriefing } from "@/lib/sample";
import { TOPICS, type Article, type Briefing, type Leg, type Profile } from "@/lib/types";

export const maxDuration = 120;

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
          category: { type: "string", enum: TOPICS },
          also_reported_by: {
            type: "array",
            items: { type: "object", properties: { outlet: { type: "string" }, url: { type: "string" } }, required: ["outlet", "url"] },
          },
        },
        required: ["outlet", "original_headline", "english_headline", "date", "summary", "why_it_matters", "url", "category"],
      },
    },
  },
  required: ["landing_note", "articles"],
};

type SearchResult = { url: string; title?: string; date?: string };
type AgentResponse = {
  status?: string;
  output_text?: string;
  output: {
    type: string;
    content?: { text?: string }[];
    results?: SearchResult[];
  }[];
};

type Req = { profile: Profile; leg: Leg; count: number; topic?: string; exclude: string[] };

async function search({ profile, leg, count: wanted, topic, exclude }: Req, recency: "week" | "month") {
  const count = exclude.length ? wanted + 2 : wanted;
  const market = marketFor(leg.country)!;
  const outlets = market.outlets.map((o) => `${o.name} (${o.domain})`).join(", ");

  const system = `You are the foreign desk editor of Worldesk, a briefing service for international business executives.
You ONLY use articles published by these trusted ${market.country} outlets: ${outlets}.
Write every search query in ${market.language}, the way a local reader would, and use only ${market.language}-language articles.${
    market.language === "English" ? "" : ` Never use English-language editions (e.g. NHK World, Nikkei Asia, "/en/" pages).`
  } Never invent articles, headlines or URLs: every url must be the exact article URL from your search results.
At least half of the stories must be directly about the reader's industry; the rest may be the local economy or policy that affects it. If you do not have the exact original headline, return an empty string for original_headline rather than a placeholder. Skip opinion pieces, horoscopes, sports and celebrity news.`;

  const employer = profile.company?.trim() ? `${profile.company.trim()}, a ${profile.industry} company` : `a ${profile.industry} company`;
  // Markets replaced trip stops in onboarding; older saved trips still carry dates.
  const where = leg.arrive
    ? `Trip: ${leg.city}, ${leg.country}, ${leg.arrive} to ${leg.depart}.`
    : `Market they follow: ${leg.country} (main business hub: ${leg.city}).`;
  const context = leg.arrive ? `before meetings in ${leg.city}` : `to do business in ${leg.country}`;

  const user = `Reader: ${profile.title || "executive"} in ${profile.func} at ${employer}${profile.homeCountry ? `, based in ${profile.homeCountry}` : ""}.
Topics they follow: ${profile.topics.join(", ") || "markets and economy"}.
${where}

${
    topic
      ? `Find up to ${count} recent stories from the outlets above in the category "${topic}" that this reader should know ${context}. Every story must fit that category.`
      : `Find up to ${count} recent stories from the outlets above that this reader should know ${context}. Cover the reader's topics: aim for at least one strong story per topic, then rank by relevance to their industry and function.`
  }
Tag each story with exactly one category from: ${TOPICS.join(", ")}.${
    exclude.length ? `\nThe reader has already seen these, do NOT return them again:\n${exclude.slice(0, 40).join("\n")}` : ""
  }
For each: outlet name, the original ${market.language} headline, an accurate English translation, publication date (YYYY-MM-DD), a 2-sentence English summary that keeps the local framing and tone, and one sentence "why it matters" addressed to this reader (concrete: which conversation or decision it affects${profile.company?.trim() ? `, for ${profile.company.trim()} specifically where possible` : ""}).
also_reported_by: if another of the listed outlets also reported the same story, give its outlet name and exact article URL from your search results; otherwise an empty list.
landing_note: one sentence on the overall business mood in ${leg.arrive ? leg.city : leg.country} this week, based only on these stories.`;

  // Perplexity Agent API: https://docs.perplexity.ai/api-reference/agent-post
  const res = await fetch("https://api.perplexity.ai/v1/agent", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "openai/gpt-5.6-luna",
      instructions: system,
      input: user,
      // 1 search round: ~20-30s vs 50-100s at 5 rounds, with similar story quality in testing
      max_steps: Number(process.env.BRIEF_STEPS ?? 1),
      tools: [
        {
          type: "web_search",
          filters: {
            search_domain_filter: market.outlets.flatMap(domainsOf),
            search_recency_filter: recency,
          },
        },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "briefing", schema: SCHEMA },
      },
    }),
  });
  if (!res.ok) throw new Error(`Perplexity ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = (await res.json()) as AgentResponse;
  if (data.status && data.status !== "completed") throw new Error(`Perplexity status ${data.status}`);

  const text =
    data.output_text ??
    data.output
      .filter((o) => o.type === "message")
      .flatMap((o) => o.content ?? [])
      .map((c) => c.text ?? "")
      .join("");
  const parsed = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")) as { landing_note: string; articles: Article[] };
  const results: SearchResult[] = data.output
    .filter((o) => o.type === "search_results")
    .flatMap((o) => o.results ?? []);
  return { parsed, results, market };
}

function clean(
  parsed: { articles: Article[] },
  results: SearchResult[],
  market: NonNullable<ReturnType<typeof marketFor>>,
  exclude: string[],
  topic?: string,
) {
  const found = new Set(results.map((r) => r.url.replace(/\/$/, "")));
  const seen = new Set<string>(exclude.map((u) => u.replace(/\/$/, "")));
  const out: Article[] = [];
  for (const a of parsed.articles ?? []) {
    const outlet = outletForUrl(a.url, market);
    if (!outlet) continue; // trust rule: only whitelisted domains
    if (market.language !== "English" && isEnglishEdition(a.url)) continue; // local-language rule
    const key = a.url.replace(/\/$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    // Drop bare home/section pages: an article URL has a meaningful path
    if (new URL(a.url).pathname.split("/").filter(Boolean).length < 1) continue;
    // A topic request searched for that category, so file its results there
    const category = topic ?? (TOPICS.includes(a.category) ? a.category : "Markets & Economy");
    // Extra sources pass the same trust checks as the primary link
    const sources = [{ outlet: outlet.name, url: a.url }];
    for (const s of a.also_reported_by ?? []) {
      const o = outletForUrl(s.url, market);
      if (!o || sources.some((x) => x.url === s.url || x.outlet === o.name)) continue;
      if (market.language !== "English" && isEnglishEdition(s.url)) continue;
      sources.push({ outlet: o.name, url: s.url });
    }
    const { also_reported_by: _drop, ...rest } = a;
    out.push({ ...rest, category, outlet: outlet.name, sources, verified: found.has(key) });
  }
  // Prefer stories the search engine actually returned; keep unverified only as filler
  out.sort((x, y) => Number(y.verified) - Number(x.verified));
  const verified = out.filter((a) => a.verified);
  return verified.length >= 3 ? verified : out;
}

// The article's own preview image, read from its og:image / twitter:image tag. URLs are already
// limited to whitelisted outlets; anything slow, blocked or odd just means "no image".
async function previewImage(url: string): Promise<string | undefined> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(3000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; WorldeskPreview/1.0)", Accept: "text/html" },
      redirect: "follow",
    });
    if (!res.ok || !res.headers.get("content-type")?.includes("html")) return;
    const head = (await res.text()).slice(0, 200_000);
    const m =
      head.match(/<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image)["'][^>]*content=["']([^"']+)["']/i) ??
      head.match(/<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["'](?:og:image|twitter:image)["']/i);
    if (!m) return;
    const img = new URL(m[1].replace(/&amp;/g, "&"), url);
    return img.protocol === "https:" ? img.href : undefined;
  } catch {
    return;
  }
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<Req>;
  const { profile, leg } = body as Req;
  const r: Req = { profile, leg, count: body.count ?? 5, topic: body.topic, exclude: body.exclude ?? [] };
  if (!marketFor(leg.country)) {
    return NextResponse.json({ error: `${leg.country} is not a covered market yet` }, { status: 400 });
  }
  if (!process.env.PERPLEXITY_API_KEY) {
    return NextResponse.json(sampleBriefing(profile, leg, r.count, r.topic));
  }
  try {
    // Topic deep-dives look back a month so there is enough to explore; the top briefing stays on this week
    let { parsed, results, market } = await search(r, r.topic ? "month" : "week");
    let articles = clean(parsed, results, market, r.exclude, r.topic);
    if (articles.length < 3 && !r.topic) {
      ({ parsed, results, market } = await search(r, "month"));
      articles = clean(parsed, results, market, r.exclude, r.topic);
    }
    const top = articles.slice(0, r.count);
    const images = await Promise.all(top.map((a) => previewImage(a.url)));
    const briefing: Briefing = {
      landing_note: parsed.landing_note,
      articles: top.map((a, i) => (images[i] ? { ...a, image: images[i] } : a)),
      source: "live",
    };
    return NextResponse.json(briefing);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
