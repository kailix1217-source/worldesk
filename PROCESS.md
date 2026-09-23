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

### Feedback round 3 (testing the briefing)
My feedback (in Chinese, summarized): the local-language headline duplicates the English one; the 40–60 s wait causes anxiety (I suggested a progress bar or a clock-style ring with a percentage); topics I never picked (e.g. Labor) still appear, and tapping Labor spun for 2 minutes without results; the "briefing rhythm" panel is confusing: it should be a feature, not something to read; drop email and use push only, with the story readable inside the notification; and I didn't understand the 4 little bars under each city.

Structured prompt given to the AI:
```
Fix six problems while keeping trust rules, design system and API:
1. Show only the English headline (trust = outlet + "Source verified" + "Read the original" link).
2. Replace the skeleton with an honest progress ring + percentage (estimated from typical duration, capped at 95% until results arrive) and step labels tied to what the system is doing; preload the user's topics in the background; 100 s timeout with retry.
3. Only show topics the user chose; track loading per city AND per topic so one request never blocks another.
4. Remove the visible rhythm panel; replace it with one alert card ("Get this briefing on your phone" → Turn on alerts); cadence stays backend behavior.
5. Push only, no email. Notification = "<City> · in N days" + "<Outlet>: <headline>" + why it matters; tapping opens that city and scrolls to the story. Settings: daily time, breaking alerts on my topics. Turning alerts on sends a real sample notification.
6. Replace the unexplained 4-bar depth meter with a plain label ("Full briefing" / "Preview").
```

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
| v9 | Feedback round 3: English headline only; progress ring with honest % and live step labels; only the user's own topics as filters, preloaded in the background; loading tracked per city and per topic (fixes Labor spinning forever); rhythm panel replaced by one "Turn on alerts" card; push-only alerts whose notification carries the story and jumps to it on tap; depth bars replaced by "Full briefing / Preview" labels | Testing showed duplication, waiting anxiety, and UI that needed explaining |
| v10 | **Speed.** Testing v9 showed searches taking 50–100 s when several ran in parallel, and a duplicate-request bug caused a false "took too long" error. Measured search depth: 5 rounds ≈ 50–100 s, 1 round ≈ 20–30 s with the same quality (5–6 verified, relevant stories per city). Switched to 1 round, retimed the progress ring to "20–40 s", added a guard against duplicate requests, and raised the server time limit for deployment | Fixing the wait itself beats decorating it |
| v11 | Visual iterations: tried a tweakcn theme (Outfit/Merriweather, orange + navy), switched its ground to white, then redesigned the landing page from a reference I liked: soft grey "aura" style, large rounded panel, pill controls, Space Grotesk + Space Mono | I preferred a calmer, more premium look than the stock theme |
| v12 | Landing intro: a 3D carousel of dotted world-map tiles (16 regions, covered markets as orange dots) shuffles, slows, then steps aside for the message. Plays once per session, tap to skip, off for reduced-motion users. Removed city/newspaper pills; WORLDESK became the brand pill | Make the first 3 seconds say "the whole world's local press" without words |
| v13 | Extracted the landing palette and type into a Worldesk design system (Claude Design), then applied it to the profile, trip and briefing pages: black pill buttons, grey pill inputs, rounded surfaces, mono labels. Flagged two low-contrast greys and used a darker grey (5.2:1) for meaningful small text | One consistent look from landing to briefing |

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
