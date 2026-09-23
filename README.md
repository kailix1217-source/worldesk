# Worldesk: prototype

**Live:** https://worldesk.vercel.app (tap "See a sample executive" for the demo)

A personal news briefing for international business travelers. It covers local business news from a fixed list of trusted local papers, searched in the local language, filtered to the reader's industry and role, and weighted by where their trip goes next.

## Run locally
```bash
npm install
cp .env.example .env.local   # then paste your Perplexity API key into .env.local
npm run dev                  # http://localhost:3100
```
Without a key, the app runs in **Sample mode** with clearly labelled placeholder stories.

## Deploy (public link)
1. Push this folder to a GitHub repo.
2. On vercel.com: Add New → Project → import the repo.
3. Under Environment Variables, add `PERPLEXITY_API_KEY`, then click Deploy.

## How it works
- `lib/sources.ts`: the trusted outlets for each market. **Only these domains are ever searched.**
- `app/api/briefing/route.ts`: calls Perplexity `sonar` with `search_domain_filter` set to that market's outlets. It asks for local-language search and structured JSON output, then **drops any story whose URL is not from an approved outlet**. Stories whose URL appeared in the search engine's own results are marked "Source verified".
- `app/page.tsx`: the onboarding (profile → trip) and the briefing view. The current or next stop gets a full 6-story briefing, later stops get a 3-story preview, and past stops become a recap.
