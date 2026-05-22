# ASO Audit Agent

Paste an Apple App Store URL → confirm the app → get a scored ASO audit with actionable fixes.

Built with **Mastra** (agents, tools, workflows, skills) and **Next.js**.

## Setup

**Requirements:** Node.js 22.13+, an OpenAI-compatible API key.

```bash
npm install
cp .env.example .env   # add OPENAI_API_KEY
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Try it:** paste a URL like `https://apps.apple.com/us/app/spotify-music-and-podcasts/id324684580`, confirm the app, then reply **yes** to run the audit.

## How it works

1. You paste an App Store URL.
2. The agent fetches metadata (name, developer, icon, category) and asks you to confirm.
3. After confirmation, it pulls full listing + competitor data and runs the ASO audit.
4. You get a score card, quick wins, and before/after copy suggestions.

```
User → Chat Agent → iTunes API (metadata & listing)
                 → Audit Agent + aso-audit skill (report)
```

## Project layout

```
src/
├── app/                    # Next.js UI + /api/chat
├── components/             # Chat + markdown report
├── lib/app-store.ts        # URL parse, iTunes API, optional Firecrawl
└── mastra/
    ├── agents/             # Chat + audit agents
    ├── tools/              # parse URL, fetch metadata, run audit
    ├── workflows/          # Same flow with human-in-the-loop suspend
    ├── models.ts           # LLM config (@ai-sdk/openai)
    └── memory.ts

workspace/skills/aso-audit/SKILL.md   # Scoring rubric & output format
```

## Environment

| Variable | Required | Notes |
|----------|----------|--------|
| `OPENAI_API_KEY` | Yes | OpenAI, NVIDIA NIM, etc. |
| `OPENAI_MODEL` | No | Default: `gpt-4o-mini` |
| `OPENAI_BASE_URL` | No | Custom OpenAI-compatible endpoint |
| `FIRECRAWL_API_KEY` | No | Better subtitle / keyword scraping |

## Design choices

- **iTunes API** for reliable public listing data (no auth).
- **Firecrawl optional** for fields iTunes doesn’t expose (subtitle, keywords).
- **Two agents** — chat orchestrates; audit agent writes the long report.
- **Human-in-the-loop** in agent instructions and in the `aso-audit-workflow` (`suspend()` until you confirm).
- **ASO skill** encodes the take-home scoring framework so audits stay consistent.
