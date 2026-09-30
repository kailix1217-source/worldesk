# Worldesk prototype: process documentation
Kailin Xu · MOR-531 Applied Product Management · Individual prototype

**Prototype link:** https://worldesk.vercel.app (live; tap "See a sample executive" for the Germany + Japan demo)
**Code:** https://github.com/kailix1217-source/worldesk

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

### Feedback round 4 (onboarding redesign)
My feedback (in Chinese, summarized): split "Tell us about your work" into several steps following four reference screens (Create your account → About you → Choose your markets → Choose topics), remove the "Where are you headed?" trip step so "Build my briefing" comes right after topics, and keep Worldesk's light colors instead of the references' dark navy.

Structured prompt given to the AI:
```
Redesign onboarding after "Set up my briefing". Follow the layout of the four reference screens, keep Worldesk's visual system (light ground, white cards, grey pill inputs, black pill button, Space Grotesk/Mono, #E8622C for selected states).
1. Create your account: full name, email, password; "Already have an account? Log in". Prototype: account stays in this browser, never store the password, say so.
2. About you: job title, function, industry, company (optional).
3. Choose your markets: US, UK, DE, JP, AU, FR, IN, BR, CN, CA, SG, AE; Continue disabled until one is picked.
4. Choose topics (optional); primary button "Build my briefing".
Remove the trip step; organise the briefing by market (one tab per country), loading a market when its tab opens. Add trusted outlets for the new markets; the English-edition block applies only to non-English markets. Use the company to sharpen "Why it matters". Migrate saved profiles.
```

## 3. Key design decisions for trustworthiness
1. **Three authoritative outlets per market** (`lib/sources.ts`), chosen by one rule: the public broadcaster or national news agency, the newspaper of record, and the leading business daily, e.g. Germany: Tagesschau, FAZ, Handelsblatt; China: Xinhua, People's Daily, CCTV. The AI search is technically limited to these domains (`search_domain_filter`), and every outlet was tested to confirm the search can actually reach it.
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
| v14 | Feedback: the briefing was all grey/white and tiring to scan. Story cards became white with a clearer shadow, titles grew (24px, lead 30px), and #E8622C now appears only in fixed places: the "Why it matters to you" callout (orange tint + bar), NEW markers, the next stop, and loading progress. Small orange text uses #B8461A so it passes 4.5:1 | Give the eye anchors; make "relevant to me" and "new" findable at a glance |
| v15 | Feedback: put the design-system cover on the profile page and highlight the briefing summary. Added a brand banner (wordmark + real dotted-map tiles with market pins, sized so shapes never overlap the name) above the profile form; the "this week in <city>" summary became a dark ink panel, the page's strongest block | A branded moment during setup; the one-sentence takeaway should be read first |
| v16 | Feedback: add a plane motif above the trip form. Added a dark "night flight" banner: the dotted world map with the user's stops drawn live as orange dashed routes, a plane flying the first leg (static for reduced-motion users), and "YOUR ROUTE · Munich → Tokyo". The view centres on the route so both ends stay visible on phones | The trip step should feel like planning a journey, and reflect the input as it's typed |
| v17 | Selected profile topics turn orange (#E8622C, dark text for contrast, with a ✓). Merged the design branch into main and deployed to Vercel; the API key is stored as a Vercel secret, never in the code or uploads | Ship a public link for the class |
| v18 | Feedback round 4: a 4-step onboarding (account → about you → markets → topics) with a progress bar, following reference layouts in Worldesk's colors. The trip step is gone: the briefing now has one tab per chosen market and loads a market when its tab opens. Added trusted outlets for 7 new markets (US, UK, Australia, India, Canada, Singapore, UAE); the English-edition block now applies only to non-English markets. The optional company sharpens "Why it matters" (tested: "For Acme Robotics, this affects sourcing…"). Accounts stay in the browser with no stored password; testing showed "Log in" could never find an account, so "Start over" became "Log out" and the sample executive became a separate demo that no longer overwrites your profile | Shorter, clearer setup; follow the markets an executive actually works in rather than one trip |
| v19 | Feedback: the brand banner at the top of "About you" pushed the title down, so the eye jumped between steps. Every step now starts at the same height (title at the same pixel on all four, measured), and the banner moved below the Continue button as a closing brand moment. Also fixed the banner art being clipped by the rounded corner and, on phones, touching the wordmark (now 18 px apart) | Keep the eye in one place while moving through a multi-step form |
| v20 | Feedback: use the three most authoritative local outlets per market, and show only the country name on the market cards. Researched trust data (Reuters Institute Digital News Report 2026: public broadcasters and papers of record are the most trusted; e.g. Singapore: CNA 78%, Straits Times 77%) and applied one rule per market. Then tested all 36 outlets against the search API: Japan's big names (NHK Japanese, Nikkei, Asahi, Yomiuri) return nothing but NHK World in English, so Japan returned 0 stories; Franceinfo, Financial Post, National Post and Toronto Star were also unreachable. Replaced them with the most authoritative reachable outlets (Japan: Jiji Press, Toyo Keizai, Nikkan Kogyo; France: Le Monde, Le Figaro, Les Echos; Canada: CBC, Globe and Mail, CTV News). China now uses Xinhua, People's Daily and CCTV (6 verified stories in testing) | "Authoritative" only helps if the search can actually reach it; testing caught a market that would have been empty |
| v21 | Feedback: redesign the briefing for desktop from a reference (sidebar + feed), keeping Worldesk's colors. Left sidebar: All markets, the markets chosen at signup, and Saved stories / Settings / Log out. "All markets" loads every market (max 3 searches at a time), merges stories newest first and keeps a dark summary with one line per market. New story card: the article's own preview image (og:image; a dotted-map thumbnail when there is none; 10 of 11 cards had real images in testing), a meta line (topic · outlet · country · date, "Source verified" removed from the card but still enforced), title, then "Why it matters"; the summary expands from a button at the bottom-right; the footer shows "N sources" with a "View <outlet>" button each (extra sources come from the search and pass the same whitelist check). Added bookmarks + Saved stories, and moved profile editing and push alerts into Settings. On phones the sidebar becomes a top bar with scrollable market tabs and cards stack image-first | Scan several markets at once and read "why it matters" first, with detail one tap away |
| v22 | Feedback: add World Bank indicators to each market. The AI proposed six from the Social and Economic sections (GDP growth, GDP, GDP per capita, inflation, unemployment using the ILO-modelled series so countries are comparable, population) and explained what it left out; I approved before any code was written. Each market page now has a ticker-style strip (modelled on a stock ticker, in Worldesk colors): value, change vs the previous year (percentage points for rates, percent for amounts; declines in orange), data year, and a link to the country's World Bank page. Data comes from the World Bank open API, cached for a day | Put the market's numbers next to its news, so a story can be read against the macro picture |
| v23 | Feedback from using Settings: "Edit markets" dropped me back into the signup flow (markets → topics → rebuilding the briefing), which defeats the point of editing. Editing from Settings now reuses the setup screen as a single-step editor ("EDIT MARKETS", no progress bar, Cancel / Save changes); Save returns straight to Settings, Cancel restores the previous values, and nothing is re-searched until All markets is opened. Also: job functions grew from 5 to 14 (Product Management, Data & Analytics, Software & Engineering, Research & Analysis, Strategy & Consulting, Finance, Legal, HR, Other…), and the About-you banner became shorter and sits closer to the buttons | Settings edits should be quick round trips, and the role list has to fit the people who actually use it |
| v24 | Question to the AI as PM: "Do we need a picture on every card?" Its answer: no. The value is the words; images cost vertical space, load time and licensing risk, and coverage is patchy (China: 1 of 6 stories had an image). Instead, each view now has **one lead image**: the highest-ranked story whose image is sharp enough (≥ 960 px, measured in the browser; a 723 px chart screenshot was rejected in testing in favour of a 6000 px Handelsblatt photo). Every other story is a compact text card, and the map placeholder is gone. Also added Caixin to China and hid the data year on the indicator strip (still on hover). The previous image-on-every-card version is kept on the `image-cards` branch for a side-by-side test with classmates | More stories per screen with one strong visual anchor; no fake or blurry imagery |
| v25 | Feedback: the lead image appeared in some tabs but not others, and China had none at all; include Caixin. Investigation: Caixin's preview image is only 560 px (an 840 px copy sits inside the article), and Xinhua/People's Daily publish no preview tag at all but do have photos in the article body (after QR codes and logos). Now the server collects up to five in-article pictures (skipping QR codes, logos, icons, share buttons), the browser picks the first landscape image at least 800 px wide, and the search is told to draw on every listed outlet. China went from 0 of 5 tabs with a lead image to 5 of 5, each a different story, with Caixin now in the mix (e.g. a Caixin photo leads Consumer Trends) | A missing picture was mostly a detection problem, not a missing photo |
| v26 | Pushed v18–v25 to GitHub (plus the `image-cards` comparison branch), redeployed worldesk.vercel.app, and updated the iteration log (steps 16–24) | Ship the redesigned prototype for the Week 6 presentation |

## 5. How the briefing is organised (current version)
- One tab per market the user follows, in the order they picked them. Each market is searched through its business hub (e.g. Germany → Frankfurt).
- A market's stories load when its tab is opened and are cached for the day, so following 12 markets doesn't start 12 searches at once.
- The user's chosen topics are preloaded for the open market; with no topics chosen, every topic is offered as a filter.
- *(Until v17 the briefing followed a trip: the next stop got the full briefing, later stops a preview, past stops a recap. v18 replaced trips with markets.)*

## 6. What's real vs. out of scope
**Real:** 4-step onboarding, live local-language news search across 12 markets, translation, relevance filtered to the user's role and company, source checks.
**Prototype only:** accounts are kept in the browser (no server, no stored passwords); scheduled push delivery.
**Not built (roadmap):** real accounts and login, trip planning and importing trips from email, flight status, conferences and dining, paid news licenses, company-wide (enterprise) features.

## Code
Full source: see the repo. Main files: `lib/sources.ts`, `app/api/briefing/route.ts`, `app/page.tsx`.
