# AI Council

AI Council is a frontend-first tool for bringing multiple AI roles into one structured meeting: quick reviews for fast judgment, and decision meetings for deeper analysis.

![AI Council home screen](docs/assets/ai-council-home.jpg)

![AI Council result screen](docs/assets/ai-council-result.jpg)

## Product Direction

- **Quick Review**: fast evaluation for trade-offs, assumptions, risks, and a first actionable memo.
- **Decision Meeting**: deeper analysis for strategy, stakeholders, dissent, risk review, and next steps.
- **BYOK / BYOP**: users bring their own API keys or proxy URLs. The project does not provide model service, store API keys, or pay model costs.
- **Local-first exports**: v1 avoids an official public gallery. Image exports, Markdown, JSON, copied summaries, and history stay local unless the user shares them manually.
- **Bilingual by default**: the UI supports Chinese and English, auto-selecting the browser language while keeping a manual switch.

## Tech Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- Zustand
- IndexedDB

## License

Apache-2.0

## Local Development

```bash
npm install
npm run dev
npm run build
npm run lint
```

## One-Click Relay Deploy

Deploy your own CORS relay. The relay still uses each user's own API key; it does not provide model credits.

[![Deploy to Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fandroid-notes%2Fai-council&project-name=ai-council&repository-name=ai-council&demo-title=AI%20Council&demo-url=https%3A%2F%2Fandroid-notes.github.io%2Fai-council%2F)
[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https%3A%2F%2Fgithub.com%2Fandroid-notes%2Fai-council)
[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fandroid-notes%2Fai-council)

Recommended for the lowest setup friction: Vercel. Recommended for higher free request volume: Cloudflare.

## Release Checklist

```bash
npm ci
npm run lint
npm run build
```

Before publishing, confirm GitHub Pages is set to **GitHub Actions** in the repository settings.

Cloudflare Worker relay deployment can be run from GitHub after adding `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` repository secrets. See [docs/deployment.md](docs/deployment.md).

## Usage

1. Open the app.
2. Add a model connection with your own API key before starting.
   - OpenAI official: `https://api.openai.com/v1`
   - DeepSeek official: `https://api.deepseek.com`
   - Anthropic: `https://api.anthropic.com/v1`
   - Gemini: `https://generativelanguage.googleapis.com/v1beta`
   - Ollama local: `http://localhost:11434`
   - OpenRouter or compatible relay: `https://openrouter.ai/api/v1`
   - Custom relay or self-hosted proxy: use its OpenAI-compatible `/v1` base URL.
   - Custom JSON endpoint: provide the exact POST endpoint and return a common text field such as `content`, `text`, `response`, `output_text`, `choices`, or Gemini-style `candidates`.
3. Click **Fetch models** to load model IDs when the endpoint supports it.
4. If the browser blocks CORS, use your own Worker, Function, local proxy, or compatible relay endpoint.
5. Build a council lineup. New roles default to a configured model seat with an API key.
6. Export the result as an image, Markdown, JSON, memo title, or briefing summary.
7. Keep everything local unless you manually share an exported asset.

For deployment, see [docs/deployment.md](docs/deployment.md).
For privacy and key-handling details, see [docs/security.md](docs/security.md).

## v1 Provider Scope

- OpenAI-compatible Chat Completions adapter for relay, aggregator, and self-hosted compatible endpoints.
- OpenAI Responses adapter.
- Anthropic Messages adapter.
- Gemini `generateContent` adapter.
- Ollama native `/api/chat` adapter, plus LM Studio-style `/v1` compatibility.
- Custom JSON POST adapter for self-hosted endpoints and relay services.
- Model discovery through OpenAI-compatible `/models`, Anthropic `/models`, Gemini `/models`, and Ollama `/api/tags` endpoints when CORS allows.

## Current v1 Shell

- Chinese and English UI with browser-language auto detection and manual switching.
- API-key-gated review/decision flow from question input to meeting plan, staged meeting, result page, and local history.
- Model connection screen with OpenAI-compatible, OpenAI Responses, Anthropic, Gemini, Ollama/LM Studio, and Custom JSON connection testing.
- Editable role prompts, model seats, and model-failure fallback policy before each session.
- Local privacy-first result export through image download, Markdown copy, JSON export, memo title, and briefing summary.
- Council diversity scoring to nudge users from one model seat toward richer multi-model lineups.

## What AI Council Does Not Provide

- Hosted model service
- Official public conversation gallery
- Server-side account system
- Server-side conversation storage
- Server-side API key storage
- Model usage credits or billing coverage

See [docs/product-spec.md](docs/product-spec.md) for the MVP interaction model and required safety modules.
