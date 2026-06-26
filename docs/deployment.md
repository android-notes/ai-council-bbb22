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
