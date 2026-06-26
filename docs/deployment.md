# Deployment

AI Council is designed as a static frontend. The default deployment target is GitHub Pages.

## GitHub Pages

The repository includes a GitHub Actions workflow at `.github/workflows/pages.yml`.

To enable it:

1. Push the repository to GitHub.
2. Open the repository settings.
3. Go to **Pages**.
4. Set **Build and deployment** to **GitHub Actions**.
5. Push to `main` or run the workflow manually.

The app uses hash-based routing and a relative Vite base path, so it can run from a project page such as:

```text
https://yourname.github.io/ai-council/
```

## Local Preview

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
npm run preview
```

## No Server Required

The v1 app does not require a backend for core features:

- Model connections are configured in the browser.
- A user-provided API key is required before the council can start.
- Conversation history is stored locally in IndexedDB.
- Posters, Markdown, and JSON exports are generated locally.

For real model calls, users should provide their own API key, local model endpoint, relay, or self-hosted proxy.

## One-Click Relay Deploy

Deploy a personal relay when a provider or aggregator blocks browser CORS. The relay forwards requests only to the fixed provider allowlist and still requires each user to configure their own API key in the browser.

| Platform | Best For | One-Click Deploy |
| --- | --- | --- |
| Vercel | Lowest setup friction | [Deploy to Vercel](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fandroid-notes%2Fai-council&project-name=ai-council&repository-name=ai-council&demo-title=AI%20Council&demo-url=https%3A%2F%2Fandroid-notes.github.io%2Fai-council%2F) |
| Netlify | Hard free-plan limits and simple GitHub import | [Deploy to Netlify](https://app.netlify.com/start/deploy?repository=https%3A%2F%2Fgithub.com%2Fandroid-notes%2Fai-council) |
| Cloudflare | Higher free request volume and edge runtime | [Deploy to Cloudflare](https://deploy.workers.cloudflare.com/?url=https%3A%2F%2Fgithub.com%2Fandroid-notes%2Fai-council) |

After deployment, use these Base URL patterns in AI Council:

### Vercel / Netlify

```text
https://your-project.vercel.app/api/openai/v1
https://your-project.vercel.app/api/deepseek
https://your-project.vercel.app/api/anthropic/v1
https://your-project.vercel.app/api/gemini/v1beta
https://your-project.vercel.app/api/openrouter/api/v1
```

Netlify uses the same `/api/...` paths:

```text
https://your-site.netlify.app/api/openai/v1
```

Health check:

```text
https://your-project.vercel.app/api/health
https://your-site.netlify.app/api/health
```

### Cloudflare

```text
https://your-worker.workers.dev/openai/v1
https://your-worker.workers.dev/deepseek
https://your-worker.workers.dev/anthropic/v1
https://your-worker.workers.dev/gemini/v1beta
https://your-worker.workers.dev/openrouter/api/v1
```

## Cloudflare Worker Relay

The repository includes a restricted Cloudflare Worker relay for users who need a browser CORS bridge.

It is not an open proxy. It only forwards these fixed provider routes:

- `/openai/*` -> `https://api.openai.com/*`
- `/deepseek/*` -> `https://api.deepseek.com/*`
- `/anthropic/*` -> `https://api.anthropic.com/*`
- `/gemini/*` -> `https://generativelanguage.googleapis.com/*`
- `/openrouter/*` -> `https://openrouter.ai/*`

Deploy:

```bash
npx wrangler login
npm run deploy:worker
```

### GitHub One-Click Deploy

For maintainers, local Cloudflare login is optional. Configure GitHub once, then deploy from the Actions page:

1. In Cloudflare, create an API token with Workers deploy permission.
2. Copy your Cloudflare account ID.
3. In GitHub, open **Settings -> Secrets and variables -> Actions**.
4. Add these repository secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
5. Open **Actions -> Deploy Cloudflare Worker -> Run workflow**.

The workflow validates the frontend, validates the Worker bundle with `wrangler deploy --dry-run`, and then deploys `ai-council-relay`.

Optional production hardening:

```bash
npx wrangler secret put RELAY_TOKEN
```

If `RELAY_TOKEN` is set, add this custom header in AI Council connections:

```json
{"x-ai-council-relay-token":"your-token"}
```

Example Base URLs:

```text
https://ai-council-relay.your-subdomain.workers.dev/openai/v1
https://ai-council-relay.your-subdomain.workers.dev/deepseek
https://ai-council-relay.your-subdomain.workers.dev/anthropic/v1
https://ai-council-relay.your-subdomain.workers.dev/gemini/v1beta
https://ai-council-relay.your-subdomain.workers.dev/openrouter/api/v1
```

Health check:

```text
https://ai-council-relay.your-subdomain.workers.dev/health
```
