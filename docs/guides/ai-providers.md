# AI Providers

AI text generation (Phase 8). Providers are enabled via the `aiProviders`
**array** flag — several can run at once. App code goes through `@/lib/ai` and
never imports a provider SDK directly (§1.2).

- **Anthropic** (`@anthropic-ai/sdk`) — `lib/ai/anthropic/adapter.ts`
- **OpenAI** (`openai`) — `lib/ai/openai/adapter.ts`

Both implement the same `AiAdapter` interface (`lib/ai/adapter.ts`):
`generate()` (full text) and `stream()` (text deltas).

## Enable

The toggle is a comma-separated allow-list; unknown entries are ignored, empty =
off. Set a key for each provider you list:

```env
NEXT_PUBLIC_FEATURE_AI_PROVIDERS=anthropic,openai

ANTHROPIC_API_KEY=sk-ant-...      # required when the list includes 'anthropic'
OPENAI_API_KEY=sk-...             # required when the list includes 'openai'

# Optional — default provider when several are enabled. Unset = first in the list.
AI_DEFAULT_PROVIDER=anthropic
```

`config/env.schema.ts` requires each provider's key only when that provider is in
the list, and throws at boot naming any missing one.

## Use

```ts
import { ai } from "@/lib/ai";

// Default provider (AI_DEFAULT_PROVIDER, or the first enabled one):
const { text, model, provider } = await ai().generate({
  prompt: "Summarize this changelog in one line.",
});

// Explicit provider + system prompt + multi-turn:
const res = await ai("openai").generate({
  system: "You are a terse assistant.",
  messages: [
    { role: "user", content: "Name three primary colors." },
  ],
  maxTokens: 100,
  temperature: 0.3,
});

// Streaming — yields text chunks as they arrive:
for await (const chunk of ai().stream({ prompt: "Write a haiku." })) {
  process.stdout.write(chunk);
}
```

`ai(provider?)` throws if AI is off, or if you name a provider that isn't in the
enabled list. Default model per provider lives in `lib/ai/models.ts` (override
per call with `model`) — never hardcode a model id in app code (§8).

## Example route

`app/api/ai/generate/route.ts` is a smoke test, not a full feature: it 404s when
AI is off, requires an authenticated session (`authorize()`), Zod-validates
`{ prompt, provider?, system? }`, and returns `{ ok, text, model, provider }`.

```bash
curl -X POST http://localhost:3000/api/ai/generate \
  -H "content-type: application/json" \
  -d '{"prompt":"Say hi","provider":"anthropic"}'
```

> Streaming is available on the adapter (`ai().stream()`) but the example route
> is non-streaming for simplicity. To stream over HTTP, pipe the async iterable
> into a `ReadableStream` with a `text/event-stream` response — the repo has no
> shared SSE helper yet, so that's the first place to add one.

## Add a provider

1. `lib/ai/<provider>/adapter.ts` implementing `AiAdapter`.
2. Add it to `AI_PROVIDERS` in `config/features.ts` and to the `factories` map in
   `lib/ai/index.ts`.
3. Add its default model to `lib/ai/models.ts`, its key to `.env.example`, and a
   required-when rule in `config/env.schema.ts`.
