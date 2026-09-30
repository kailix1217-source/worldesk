# Worldesk Iteration Log

**Live prototype:** https://worldesk.vercel.app · **Code:** https://github.com/kailix1217-source/worldesk

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

## Iterate after launch

### 16. Redesign onboarding into four steps

Following four reference screens but in Worldesk's own colors: Create your account → About you → Choose your markets (12 countries) → Choose topics → "Build my briefing". The trip step was removed; the briefing now has one tab per market. Added trusted outlets for 7 new markets, and the optional company makes "Why it matters to you" specific to the user's employer.

**Prompt** (translated from Chinese, abridged):

> I want to change Worldesk's onboarding. After I tap "Set up my briefing", split the old "Tell us about your work" page into several steps, like the four reference images: first "Create your account" (name, email, password, or "Log in"); then "About you" (job title, function, industry, company); then "Choose your markets", using the countries in the example; then "Choose topics" (regulation and policy, competitors, market and economy, consumer trends, labor, trade and tariffs, technology). Remove the "Where are you headed?" page, so after these steps you go straight to "Build my briefing". Keep the layouts from the references, but keep Worldesk's original colors, not the dark background in the images.

### 17. Keep every step's title at the same height

Every onboarding step now starts at the same height (measured: identical on all four), and the brand banner moved below the Continue button. Also fixed the banner art being clipped by the rounded corner and touching the wordmark on phones.

**Prompt** (translated from Chinese):

> When I create my account, the big title is at eye level, but on "About you" a Worldesk banner suddenly appears above it and pushes my eye down. Can you put "About you" at the same level as the previous step, and the same for "Choose your markets" and "Choose topics"? Keep the Worldesk banner looking good, but change its placement.

### 18. Three authoritative outlets per market

Researched trust data (Reuters Institute Digital News Report 2026) and chose, per market, the public broadcaster or news agency, the newspaper of record and the leading business daily; China uses Xinhua, People's Daily and CCTV. Then tested all 36 outlets against the search: Japan's big papers returned nothing in Japanese (so Japan showed 0 stories), and Franceinfo and some Canadian outlets were unreachable, so they were replaced with the most authoritative reachable ones. Market cards now show only the country name.

**Prompt** (translated from Chinese):

> Can you search online again for the most authoritative local media in each of these 12 markets? Give three different, authoritative outlets per country; for China, for example, Xinhua, People's Daily and CCTV. There's no need to show the sources on "Choose your markets"; just write United States, United Kingdom, Germany and so on.

### 19. Redesign the briefing for desktop

A left sidebar (All markets, the chosen markets, Saved stories, Settings, Log out) and a feed. "All markets" merges every market newest first under a one-line-per-market summary. New story card: meta line (topic · outlet · country · date), title, then "Why it matters"; the summary expands from a bottom-right button; the footer shows "N sources" with a "View <outlet>" button each. Added bookmarks and moved alerts and profile editing into Settings. On phones the sidebar becomes a top bar with scrollable market tabs.

**Prompt** (translated from Chinese, abridged):

> [reference screenshots of a dark sidebar-and-feed news app] I want the briefing to look like this, for desktop. First "All markets", then "Selected markets" (the ones the user ticked at signup). Keep the top summary. Make the story cards narrower: title first, then "Why it matters to you"; if I want more, a dropdown at the bottom-right expands the card to show the summary. Can each card have a picture on the left? Above the title keep topic, source name, country, then date, without "Source verified"; at the bottom, the date, how many sources, and buttons linking to each original source.

### 20. World Bank key figures on each market

The AI proposed six indicators from the World Bank's Social and Economic sections (GDP growth, GDP, GDP per capita, inflation, unemployment using the comparable ILO-modelled series, population) and explained what it left out. After approval, each market page got a ticker-style strip in Worldesk colors: value, change vs the previous year, and a link to the country's World Bank page.

**Prompt** (translated from Chinese):

> https://data.worldbank.org/country/china: can you add related indicators on each market, chosen from Social and Economic? The data can all be found on the World Bank for each country. First tell me which indicators you would show, and only start after I say approve.
>
> Follow-ups: What about the unemployment rate? / OK, I think it can look like this [stock-ticker screenshot], using Worldesk's color palette.

### 21. Make Settings edits save back to Settings

"Edit markets" in Settings used to drop the user back into the signup flow (markets → topics → rebuilding the briefing). Now it opens the same screen as a one-step editor with Cancel / Save changes that returns straight to Settings. Job functions grew from 5 to 14 (incl. Product Management, Data & Analytics, Software & Engineering, Research & Analysis), and the About-you banner became smaller.

**Prompt** (translated from Chinese, abridged):

> The Worldesk banner is too low; make it narrower and move it up. The job functions are too few: there should be tech roles like data analytics, software engineer, product manager or analyst. In Settings, when I click Edit markets or Edit topics, it jumps to the start of signup, and after picking markets it doesn't return to my profile: it continues to topics and immediately regenerates the briefing. That flow is wrong. After editing, the button should become something like "Save profile" and take me back to Settings.

### 22. Rethink pictures: one lead image per view

Added Caixin to China and hid the data year on the indicator strip. Then asked the AI, as a product manager, whether every card needs a picture. Its answer: no (the value is the words; images cost space, load time and licensing risk, and coverage is patchy). Each view now has one lead image; every other story is a compact text card. The previous version is kept on the image-cards branch for a side-by-side test.

**Prompt** (translated from Chinese):

> Can China's sources also include Caixin? I don't think we need to show the 2025 numbers. And if you were the product manager, what would you do if an article has no picture?
>
> Follow-ups: Do you think we necessarily need to include a picture? / Yes (build the lead-image version).

### 23. Find the real pictures

Some tabs had a lead image and others didn't, and China had none. It was mostly a detection problem: Caixin's preview image is small but a larger copy sits in the article, and Xinhua and People's Daily put photos only in the article body. The server now collects in-article photos (skipping QR codes and logos), a lead must be landscape and at least 800 px wide, and the search draws on every listed outlet. China went from 0 of 5 tabs with a lead image to 5 of 5.

**Prompt** (translated from Chinese):

> The picture only shows in some tabs: Competitors has none, Consumer Trends has one, Markets & Economy and Regulation & Policy have none. If I click China in Selected markets, its top stories have no picture at all, while France has pictures in every tab. You should add Caixin for China, because I think Caixin has pictures.

### 24. Push and redeploy

Pushed all changes to GitHub, redeployed worldesk.vercel.app, and recorded this log.

**Prompt**:

> Push to GitHub and deploy to Vercel, also record the iteration log.
