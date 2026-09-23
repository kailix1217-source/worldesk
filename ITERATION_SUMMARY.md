# Worldesk Iteration Log

**Live prototype:** https://worldesk.vercel.app

I built Worldesk in one evening with Claude Code, starting from our group's project report. I worked in a loop: give feedback (often in Chinese) → have the AI turn it into a structured English prompt → build → test in the browser, mobile width first → record the change. The product moved through six phases: scope the idea, build the core flow, make the news trustworthy and fast, make the briefing worth returning to, give it a visual identity, and ship it. For UI ideas I used **tweakcn.com** (a ready-made theme) and **variant.com** (reference designs for the landing page).

**Tools:** Claude Code (AI PM + engineer) · Perplexity Agent API (live local-language news search) · Vercel (hosting) · tweakcn.com (theme) · variant.com (UI references) · Claude Design (design system)

## Scope

### 1. Turn the report into a product

The AI read our report, questioned me in rounds, and cut six value pillars down to one core flow: profile → trip → local-language briefing for my role. Everything else went on the roadmap.

**Prompt**:

> I need to build a prototype for my project. And I currently only have a Project idea document. You are a AI Product manager who are familiar with vibe coding and the correct workflow of developing a prototype using AI. Please ask me rounds of questions to help me have a idea of what the product look like, and give your opinions

### 2. Make the key decisions

Rejected the AI's "what English search would show" comparison: the focus is trustworthy local papers. Chose live AI search, news only, a simple form, and profile questions first. Mobile-first web app; only the core path has to really work.

**Prompt** (abridged):

> I don't want to have One toggle shows "What an English search would have shown you" next to it. The news need to come from local newspaper source and it needs to be trustworthy. For the way of demonstration you can take WSJ app or website as a example. 2. live AI search 3. news focus for now 4. just a simple form. when user opens the product, it should first asking user to put in some personalize question such as age, job, industry 5. … if you are a business executive, would you prefer using an app or an website … 6. due tonight. I have 4 hours. … please tell me what a good prototype look like. does it require the feature to actually work?

## Build

### 3. Build the first version in Claude Code

Next.js app with four screens (welcome, profile, trip, briefing), sample data first, then one server route for live search. Demo persona: an automotive marketing director going Munich → Tokyo.

**Prompt**:

> I don't want to exactly copy WSJ UI. can I just use claude code to develop the prototype? For industry, Let's go with your decision.

## Trust & speed

### 4. Connect live news with the Perplexity Agent API

Search is restricted to a whitelist of respected local papers per country. Code drops any story from another domain or from an English edition (testing showed Tokyo returning NHK World in English). Each story is checked against the search engine's own results and labelled "Source verified".

**Prompt** (abridged):

> Integrate the Perplexity Agent API into this project. … Endpoint: POST https://api.perplexity.ai/v1/agent … Web grounding is a tool: pass tools: [{"type": "web_search"}] … Structured output via response_format JSON schema when this project needs parseable results. … The API key is a secret. Resolve it from the PERPLEXITY_API_KEY environment variable. Never hardcode, print, log, or commit it.

## Retention

### 5. Landing page first, filters, reminders

The app now opens on a landing page. Every story has a category tag, with filters that fetch 5 more stories per topic, "Load more", and "New since your last visit" badges. Reminders get more frequent as the trip gets closer.

**Prompt** (translated from chinese):

> When I open Worldesk I should first see a landing page that leads me to fill in my profile. The briefing should be more complete: if I'm an executive with 15 days before the trip, I won't only want to read a few story cards. Add filters and a tag on each story card showing its type (regulation, market & economy…). If I pick one category, it should show me about 5 more stories. How will I want to come back over the next few days? Think about how reminders should work.

### 6. Fix what testing revealed

English headline only. An honest progress ring with step labels. Only the user's own topics as filters, loaded in the background. Push-only alerts whose notification carries the story. Cut search time from 50–100 s to 20–30 s by using one search round (measured, same quality).

**Prompt** (translated from chinese):

> Each story card shows the headline twice (local language and English), so only show the English one. Generation takes time, so add a UI change to reduce the waiting anxiety (a progress bar, or a clock-style ring with a percentage). I never chose Labor, but its tab still appears, and after I tapped it, it loaded for two minutes with nothing. Don't show topics I didn't pick. The "briefing rhythm" panel should be a feature, not something shown on the page. No email digest, just push delivery, with the story readable inside the notification. And what do the little bars under each city mean?

### 7. Even out story-card spacing

12 px between the tag row, the title and the next block.

**Prompt** (translated from chinese):

> In a story card, the spacing between the title and the tabs above it should match the spacing to "Why it matters to you" below it. Right now the top is too tight.

## Visual identity

### 8. Try a theme from tweakcn.com

Mapped the tweakcn theme (colors, fonts, radius, shadows) onto the app's own CSS variables on a separate git branch, then switched the ground to white.

**Prompt** (translated from chinese):

> https://tweakcn.com/themes/cmlk6zefr000004lbe9jygsqc I have a theme code that want to try on this app: [theme CSS pasted]
>
> Follow-up: The background should be white, not this grey-blue.

### 9. Redesign the landing page from variant.com references

A soft grey "aura" style: large rounded panel, pill controls, black call-to-action, Space Grotesk and Space Mono. Then a 3D carousel of dotted world-map cards that shuffles before the message appears, with no city or newspaper names.

**Prompt** (translated from chinese):

> [reference screenshot from variant.com] I like this style, for the landing page.
>
> [reference: curved 3D card gallery from variant.com] I want the landing page to have a world-map shuffle like this, and show the message after the shuffle animation ends. Don't show specific cities or papers like Handelsblatt.

### 10. Turn the landing style into a design system

Extracted the palette and type into a Worldesk design system in Claude Design, flagging two low-contrast greys, then applied it to the profile, trip and briefing pages.

**Prompt** (translated from chinese):

> Can you open Claude Design? I like the landing page's colors and want to use them on all the remaining pages. First extract which colors and fonts it uses. On the landing page, emphasize "Worldesk" in the "Worldesk briefing" tag and remove "briefing", and remove the "Worldesk // Seven markets online" text in the top-left.
>
> Follow-up: Yes (apply it to the other pages).

### 11. Add contrast and one accent color

White story cards, larger titles. #E8622C appears only in fixed places: the "Why it matters to you" callout, NEW markers, the next stop, and progress. Small orange text uses a darker shade so it stays readable.

**Prompt** (translated from chinese):

> #E8622C: I think the body text can have this color in fixed places. The briefing page is all black and grey-white, so it's hard for my eyes to focus. Make each story card stand out more (its background) and make the titles bigger. The "Why it matters to you" background blends into the card. When I scroll down there's no good contrast; everything looks too similar and tires my eyes.

### 12. Brand banner and highlighted summary

A banner based on the design-system cover sits above the profile form. The weekly summary became a dark panel, the page's strongest block.

**Prompt** (translated from chinese):

> [design-system cover image] I like this. I want to add it above the page where users fill in their profile. On the briefing page, the summary at the top of Top stories with the orange bar on its left: highlight it.

### 13. A plane on the trip page

A dark "night flight" banner draws the user's stops as orange routes, with a plane flying the first leg.

**Prompt** (translated from chinese):

> On the Edit Trip page, I want to add an airplane graphic, also at the top of the page.

### 14. Orange selected topics

Selected topics use #E8622C with dark text and a ✓.

**Prompt** (translated from chinese):

> On Edit profile, when a topic under "Topics to follow" is selected, it should be the orange color.

## Ship

### 15. Merge and deploy

Merged the design branch into main, ran a production build, and deployed to Vercel. The API key is stored as a Vercel secret. Tested the live site end to end.

**Prompt** (translated from chinese):

> Merge to main and then deploy to Vercel.
