import type { Briefing, Leg, Profile } from "./types";
import { marketFor } from "./sources";

// Placeholder content shown only when no API key is configured. It is labelled
// "Sample" in the UI and links to outlet home pages, never to invented articles.
export function sampleBriefing(profile: Profile, leg: Leg, count: number): Briefing {
  const market = marketFor(leg.country);
  const outlets = market?.outlets ?? [];
  const industry = profile.industry || "your industry";
  const topics = profile.topics.length ? profile.topics : ["Markets & Economy"];
  const articles = Array.from({ length: Math.min(count, 6) }, (_, i) => {
    const o = outlets[i % Math.max(outlets.length, 1)];
    const topic = topics[i % topics.length];
    return {
      outlet: o?.name ?? "Local outlet",
      original_headline: `[${market?.language ?? "Local"}-language headline]`,
      english_headline: `Sample story ${i + 1}: ${topic} in ${leg.country} and what it means for ${industry}`,
      date: "",
      summary:
        "This is placeholder text. Add a Perplexity API key to load live stories from trusted local outlets.",
      why_it_matters: `Would explain the relevance to a ${profile.func || "professional"} in ${industry}.`,
      url: o ? `https://${o.domain}` : "#",
      verified: false,
    };
  });
  return {
    landing_note: `Sample briefing for ${leg.city}. Live mode searches ${outlets.map((o) => o.name).join(", ")} in ${market?.language ?? "the local language"}.`,
    articles,
    source: "sample",
  };
}
