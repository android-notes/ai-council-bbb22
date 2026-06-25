# Security And Privacy

AI Council is BYOK/BYOP: users bring their own API keys or proxy URLs.

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

Exports and poster generation must not include:

- API keys
- proxy secrets
- custom authorization headers
- raw connection-test payloads

## Browser And CORS Limits

Some model providers or relay services do not allow direct browser calls. In that case, users should configure their own proxy, such as a Cloudflare Worker, Vercel Function, Netlify Function, local server, or compatible relay endpoint.

Public CORS proxies are not recommended because they can expose keys and request content.

## Sensitive Decisions

AI Council is an analysis aid, not a professional advisor. Legal, medical, financial, and other high-stakes outputs should be treated as preparation material for human review, not final advice.
