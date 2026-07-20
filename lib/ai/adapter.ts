/**
 * lib/ai/adapter.ts — the AiAdapter interface (Phase 8).
 *
 * Interface+adapter shape (§1.2): app code imports only this interface (via
 * `@/lib/ai`), never a provider SDK. Concrete implementations live in
 * ./anthropic and ./openai; the active provider is chosen in ./index.ts.
 *
 * Unlike the other adapters, AI's flag (`aiProviders`) is an ARRAY — several
 * providers can be enabled at once. So the selector exposes a provider-keyed
 * accessor `ai(provider?)` rather than a single global singleton.
 *
 * The DTOs below are provider-neutral: no SDK type leaks past this seam.
 */

import type { AiProvider } from "@/config/features";

/** A single turn in a chat exchange. */
export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Inputs to a generation. Provide EITHER a one-shot `prompt` OR a `messages`
 * array (multi-turn) — if both are given, `messages` wins. `model` overrides the
 * provider's default (see lib/ai/models.ts); everything else is optional.
 */
export interface GenerateOptions {
  /** Convenience single user prompt. Ignored when `messages` is set. */
  prompt?: string;
  /** Multi-turn conversation. Takes precedence over `prompt`. */
  messages?: AiMessage[];
  /** Optional system instruction. */
  system?: string;
  /** Model id override; defaults to the provider's default model. */
  model?: string;
  /** Max tokens to generate. */
  maxTokens?: number;
  /** Sampling temperature (0–1 range, provider-dependent). */
  temperature?: number;
}

/** Result of a non-streaming generation. */
export interface GenerateResult {
  /** The generated text. */
  text: string;
  /** The model that produced it (resolved, not the requested override). */
  model: string;
  /** Which provider served the request. */
  provider: AiProvider;
}

export interface AiAdapter {
  /** Which provider this adapter talks to. */
  readonly provider: AiProvider;
  /** Generate a completion and return the full text. */
  generate(options: GenerateOptions): Promise<GenerateResult>;
  /**
   * Stream a completion as text deltas. Yields incremental chunks of generated
   * text as they arrive; concatenating every chunk equals `generate().text`.
   */
  stream(options: GenerateOptions): AsyncIterable<string>;
}
