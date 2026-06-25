# Contributing

Thanks for helping AI Council improve.

## Development

```bash
npm install
npm run dev
npm run lint
npm run build
```

## Project Priorities

For v1, keep the product:

- frontend-only by default
- local-first
- bilingual in Chinese and English
- safe around API keys and custom headers
- focused on the mock provider plus OpenAI-compatible Chat Completions

## Code Guidelines

- Keep model providers behind adapter functions.
- Keep user-facing text in the i18n translation files.
- Do not export or render secrets.
- Prefer small, explicit product flows over generic chat UI.
- Use typed data structures for sessions, roles, model connections, and exports.

## Pull Request Checklist

- `npm run lint`
- `npm run build`
- Check the mock flow from home to result page.
- Check both Chinese and English UI copy when adding visible text.
