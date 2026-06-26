# Security And Privacy

AI Council is BYOK/BYOP: users bring their own API keys or proxy URLs.

Never commit API keys, relay tokens, or provider secrets into this repository.
Provider presets such as DeepSeek or OpenRouter only fill endpoint metadata; they do not ship with keys.

## What The App Does Not Do

- It does not provide model service.
- It does not upload conversation history by default.
- It does not store API keys on an AI Council server.
- It does not run an official public gallery in v1.
- It does not pay model costs for users.

## Local Storage

The app uses IndexedDB for local state:

- local history
- model connection profiles
- generated session results
- language preference

If a user chooses **Save key on this device**, the key is stored in that browser profile. If they leave it off, the app keeps the key only in the current in-memory session.

Users can clear all local app data from the model connections screen. This removes local history, saved model connections, saved keys, and language preference from the current browser.

Exports and generated images must not include:

- API keys
- proxy secrets
- custom authorization headers
- raw connection-test payloads

If a key is shared publicly by mistake, rotate or revoke it immediately in the provider dashboard before using the app again.

## Browser And CORS Limits

Some model providers or relay services do not allow direct browser calls. In that case, users should configure their own proxy, such as a Cloudflare Worker, Vercel Function, Netlify Function, local server, or compatible relay endpoint.

Model discovery uses the selected OpenAI-compatible connection's `/models` endpoint. This request is made directly from the user's browser with the key they entered.

Public CORS proxies are not recommended because they can expose keys and request content.

The included Vercel, Netlify, and Cloudflare relay entries are intended for self-hosting. They forward requests only to a fixed provider allowlist and do not store API keys, but the relay operator still controls the endpoint and can see traffic metadata in platform logs. For public deployments, set a `RELAY_TOKEN` secret or keep the relay URL private.

## Sensitive Decisions

AI Council is an analysis aid, not a professional advisor. Legal, medical, financial, and other high-stakes outputs should be treated as preparation material for human review, not final advice.
