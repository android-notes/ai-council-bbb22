# AI Council Product Spec

## Core Principle

The product should start with one key and one working model, then gradually invite users to upgrade their council with more models, sharper roles, and deeper discussion.

Users should feel like they are upgrading an AI council lineup, not filling out an API configuration form.

## Main Modes

### AI Debate Arena

Entertainment-first mode.

- Goal: make the discussion fun, conflict-heavy, and easy to share.
- Default behavior: use preset topics or a lightweight user prompt.
- Roles: host, aggressive supporter, skeptical opponent, conservative realist, quote maker.
- Output: stance poster, strongest quote, split score, short-video script, copyable title.
- Missing context: continue with visible assumptions instead of stopping too often.

### AI Council Room

Decision-first mode.

- Goal: help users think through real decisions.
- Default behavior: ask for key constraints before starting.
- Roles: host, strategy advisor, risk officer, execution advisor, stakeholder representative, dissent reviewer.
- Output: recommendation memo, minority opinion, key assumptions, risk matrix, action plan, reversal conditions.
- Missing context: pause and ask the user for the most important missing information.

## Primary Flow

1. User enters through a preset debate or starts a custom decision.
2. AI generates a role lineup based on topic and mode.
3. System automatically maps roles to available model connections.
4. User can start immediately, edit roles, or regenerate the lineup.
5. The lineup page shows council diversity, editable role prompts, and model-failure policy.
6. Conversation runs by stage, not by elapsed time.
7. Host summarizes disagreements and produces the final memo from the actual discussion.
8. Result page creates local sharing assets and suggests council upgrades.

## Frontend Stack

The v1 app should be built as a static frontend that can run on GitHub Pages.

- **React** for the UI and component model.
- **Vite** for static frontend builds and fast local development.
- **TypeScript** for model adapters, role definitions, session stages, and export formats.
- **Tailwind CSS** for a lightweight design system and fast iteration.
- **Zustand** for app state such as current session, roles, model mappings, and UI mode.
- **IndexedDB** for local history, connection profiles, generated reports, and drafts.

Implementation constraints:

- Use hash-based routing so GitHub Pages refreshes do not 404.
- Keep the app fully static by default.
- Do not require a server for v1 core features.
- Keep API keys, proxy secrets, and custom auth headers out of exports and share assets.
- Deploy through GitHub Pages with GitHub Actions.
- Treat server-backed features such as public galleries, accounts, likes, and rankings as post-v1.

## Language Strategy

The interface should support Simplified Chinese and English from v1.

- Auto-select the initial language from the browser locale.
- Fall back to English if the locale is not supported.
- Provide a visible manual language switch.
- Keep language files separate from component logic.
- Store the user's manual language choice locally.
- Product copy should stay concise because many control surfaces are dense.

## Model Connection Strategy

First-run setup should support one-key usage:

- One model can power all roles through different prompts.
- Additional models are optional upgrades.
- OpenAI-compatible Chat Completions should be the default protocol for relay and aggregator users.
- v1 should ship a mock provider and an OpenAI-compatible Chat Completions adapter.
- Other protocols can be added later as adapters: OpenAI Responses, Anthropic Messages, Gemini, Ollama/LM Studio, custom.

The internal abstraction should be:

```ts
type ModelConnection = {
  id: string
  name: string
  protocol:
    | "openai-chat-completions"
    | "openai-responses"
    | "anthropic-messages"
    | "gemini"
    | "ollama"
    | "custom"
  baseUrl: string
  apiKey?: string
  model: string
  customHeaders?: Record<string, string>
  secretStorage: "session" | "local"
  status: "untested" | "connected" | "failed"
}
```

Roles should bind to model connections, not directly to vendors.

v1 provider scope:

- **Mock provider**: powers the complete demo flow without requiring a key.
- **OpenAI-compatible Chat Completions**: supports relay sites, OpenRouter-like aggregators, and compatible self-hosted endpoints.
- **Post-v1 adapters**: OpenAI Responses, Anthropic Messages, Gemini, Ollama/LM Studio, and custom request templates.

Role-to-model assignment should support:

- Manual model seat selection per role.
- Automatic lineup optimization after the user adds extra model connections.
- Advanced prompt editing per role for users who want to tune the council personality.
- A visible diversity score that makes the one-key-to-many-model upgrade path feel like improving the council, not configuring infrastructure.

## MVP Required Modules

### 1. Model Connection Test

Before a connection is used in a council, the app must offer a test button.

Test goals:

- Verify base URL and API key.
- Verify model ID is callable.
- Detect whether streaming works.
- Normalize common error messages.
- Confirm response shape matches the selected protocol.

User-facing states:

- Connected
- Authentication failed
- Model unavailable
- Protocol mismatch
- Network or CORS blocked
- Streaming unsupported, fallback to normal response

### 2. Discussion Depth And Call Control

The app must control depth by stages and call counts, not by time.

Default depth presets:

- Quick: initial opinions plus host summary.
- Standard: initial opinions, rebuttal, revision, host summary.
- Deep: initial opinions, cross-examination, revision, risk review, vote, final memo.

Each session should enforce:

- Maximum stages
- Maximum model calls
- Maximum turns per role
- Maximum output tokens per call
- Optional estimated cost level

The UI should show estimated call count and cost level before starting.

### 3. Local History And Privacy Clear

Conversation history should be local-first in v1.

Requirements:

- Store history in browser storage only.
- Never upload conversation history by default.
- Provide export as Markdown and JSON.
- Provide clear current session.
- Provide clear all local history.
- Provide a visible privacy note: history is stored on this device/browser.

Sensitive values that must never be exported:

- API keys
- Proxy secrets
- Custom authorization headers
- Internal connection test payloads

### 4. Share Poster Privacy Check

Before generating a poster or long image, the app must show a privacy review step.

Options:

- Hide original question.
- Hide personal background.
- Share conclusion only.
- Remove emails, phone numbers, and amounts where possible.
- Choose entertainment poster or serious memo image.

The poster is generated locally. The project should not provide an official public gallery in v1.

### 5. Model Failure Fallback

A single model failure should not crash the whole session.

Fallback actions:

- Retry once.
- Substitute with default model.
- Skip the failed role.
- Mark the role as unavailable and continue.
- Ask the host to summarize partial results.
- Save partial progress locally.

The user should be able to choose a default fallback policy:

- Conservative: stop and ask me.
- Balanced: retry, then substitute.
- Fast: skip failed roles and continue.

## v1 Non-Goals

- Official public share gallery
- Server-side account system
- Server-side conversation storage
- Global likes or ranking
- Hosting user API keys
- Paying model costs for users

These can be revisited after local sharing and private council usage are validated.
