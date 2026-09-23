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

### Feedback round 2 (after using the live prototype)
My raw feedback (in Chinese, summarized): the app should open on a landing page that leads into the profile; the briefing is a dead end: after reading ~6 stories an executive with 15 days until the trip has no reason to explore further or come back. I want category tags on each story, filters to dig into one category (e.g. only Markets & Economy, 5 more stories), and some kind of reminder, but I wasn't sure how reminders should work.

I asked the AI to turn my feedback into a structured prompt first, then execute it:

```
You are the product engineer for Worldesk... Implement these three changes based on user feedback, keeping the existing design system, trust rules and the Perplexity Agent API route.
1. Landing page first — every visit opens the landing page; returning users see "Welcome back" + "Open my briefing"; add "How it works" and a real example story card.
2. An explorable briefing — every story card shows a category tag (fixed set, assigned by the AI); a filter row with "Top stories" (default: one strong story per profile topic) plus one chip per category; choosing a category fetches 5 new stories in that category from the same trusted outlets without repeats; "Load more" at the bottom.
3. Reasons to come back — "New" badges and "N new since your last visit"; a visible itinerary-aware "Briefing rhythm": >7 days out weekly digest → final week daily briefing → day before pre-arrival brief → in city morning brief + breaking alerts on the user's topics; alert settings (email / browser notification / off) with a real "Send test alert"; be honest that scheduled delivery isn't connected.
Constraints: mobile-first, no new dependencies, no login or database. Verify with a type check and a live run on Munich.
```

**The reminder design, and why:** reminders get more frequent as the trip gets closer, which extends our "itinerary-aware" pillar. Executives dislike notification noise, so the default is one digest, and breaking alerts are opt-in and limited to their own topics.

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
| v7 | Feedback round 2: landing page first (with "Welcome back" for returning users), category tags on every story, filter chips with a 5-story deep-dive per category, "Load more", "New since last visit" badges, an itinerary-aware briefing rhythm and alert settings with a real test notification | After reading 6 stories there was nothing left to do and no reason to come back |
| v8 | Bug from testing v7: choosing a category showed no new stories. The AI kept returning stories already shown, which my code dropped as duplicates. Fix: ask for 4 extra candidates, search the past month for category deep-dives, and show a clear "no new stories" message instead of failing silently. Regulation & Policy then returned 5 new stories, including a German ban on certain environmental claims in advertising | Found by testing the filter live |

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
