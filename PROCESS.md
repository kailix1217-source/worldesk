# Worldesk prototype: process documentation
Kailin Xu · MOR-531 Applied Product Management · Individual prototype

## Tool
**Claude Code** (an AI coding agent), used in two roles: first as an AI product manager to narrow the scope, then as the engineer that wrote, ran and tested the code. The live news search uses the **Perplexity Agent API** (`web_search` tool limited to approved outlets).

## 1. Narrowing the scope (conversation with the AI as PM)
**My opening prompt:**
> "I need to build a prototype for my project. And I currently only have a Project idea document. You are an AI Product manager who is familiar with vibe coding and the correct workflow of developing a prototype using AI. Please ask me rounds of questions to help me have an idea of what the product looks like, and give your opinions."

The AI read our group report and gave feedback:
- **Strength:** the gap (local-language news missing from English search) can be shown on screen, and "itinerary-aware" is new.
- **Risk:** the report lists 6 value pillars (news, bleisure, flight status, conferences, LinkedIn, monetization), which is too many for one prototype.
- **Recommendation:** keep only the core: profile → trip → local-language briefing filtered to my job. Everything else goes on the roadmap.

**My decisions** (where I agreed with or overrode the AI):
| AI suggestion | My decision |
|---|---|
| Toggle comparing the briefing with "what an English search would show" | **Rejected.** The focus should be on trustworthy local sources, not a comparison. |
| News plus a cultural-etiquette note | **News only** for now |
| Paste a confirmation email to import the trip | **Simple form** |
| Leave age out of onboarding | Kept it as an **optional** field |
| Mock data or live search | **Live AI search** |
| Lovable for the front end | **Claude Code only** |
| WSJ-style design | Editorial feel, but **not a copy** of WSJ |

## 2. Prompts used to build
> "I don't want to have [the English-search comparison]. The news needs to come from local newspaper sources and it needs to be trustworthy... live AI search... news focus for now... just a simple form. When the user opens the product, it should first ask the user to put in some personalization questions such as age, job, industry... due tonight, I have 4 hours."

> "I don't want to exactly copy WSJ UI. Can I just use Claude Code to develop the prototype? For industry, let's go with your decision."

## 3. Key design decisions for trustworthiness
1. **A fixed list of approved outlets for each market** (`lib/sources.ts`), e.g. Germany: Handelsblatt, FAZ, Süddeutsche, Automobilwoche; Japan: Nikkei, NHK, Asahi. The AI search is technically limited to these domains (`search_domain_filter`).
2. **Search in the local language** (German, Japanese…), then translate and summarize in English.
3. **A second check in code:** any story whose URL isn't from an approved outlet, or that comes from an English-language edition, is dropped, even if the AI returned it. Stories found in the search engine's actual results get a "✓ Source verified" label.
4. **Every card shows** the outlet, the date, the original-language headline and a link to the original article.

## 4. Iterations
| Version | What changed | Why |
|---|---|---|
| v0 | Group report only | — |
| v1 | Scope cut to 4 screens: welcome, profile, trip, briefing | Report had too many features for one night |
| v2 | Built the app with sample data; tested on phone size | Check the flow and look before connecting live data |
| v3 | Fixed dates showing one day late (UTC vs. local time) and the wordmark reading "Worlddesk" | Found by testing in the browser |
| v4 | Connected live search using the Perplexity **Agent API** (`/v1/agent`, `web_search` tool limited to approved domains, results returned as structured JSON), replacing the one-shot `sonar` call | The core claim has to be real; the Agent API can search several times before answering |
| v5 | Live test: Munich returned 6 German automotive stories, all verified. **Tokyo failed**: all 3 stories came from NHK World (English) and none were about autos | Found by testing with a real persona |
| v6 | Blocked English editions in code (NHK World, Nikkei Asia, `/en/` pages); required search queries in the local language and at least half of stories on the user's industry; added Nikkan Kogyo Shimbun and Toyo Keizai. Tokyo now returns 6 Japanese-language automotive stories, all verified | "Local sources" has to mean local-language reporting, not just local domains |

## 5. How "itinerary-aware" works (the logic)
- The stop you're in, or the next upcoming one, gets a **full briefing (6 stories)**.
- Later stops get an **early preview (3 stories)** that grows as the date gets closer.
- Past stops become a **recap**.
- The 4-bar "depth" meter on each city in the timeline shows this weighting.

## 6. What's real vs. out of scope
**Real:** onboarding, trip entry, live local-language news search, translation, relevance filtered to the user's role, source checks.
**Not built (roadmap):** accounts and login, importing trips from email, flight status, conferences and dining, paid news licenses, company-wide (enterprise) features.

## Code
Full source: see the repo. Main files: `lib/sources.ts`, `app/api/briefing/route.ts`, `app/page.tsx`.
