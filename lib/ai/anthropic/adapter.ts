/**
 * lib/ai/anthropic/adapter.ts — Anthropic implementation of AiAdapter.
 *
 * The only module that imports `@anthropic-ai/sdk`. Reads its key from the
 * validated `env` (never `process.env`, §4). Translates the provider-neutral
 * GenerateOptions into a Messages API call and normalizes the response/stream
 * back to plain text so no SDK type escapes the seam.
 */

import Anthropic from "@anthropic-ai/sdk";

import { env } from "@/config/env.schema";

import type { AiAdapter, GenerateOptions, GenerateResult } from "../adapter";
import { DEFAULT_MODELS } from "../models";

/** Anthropic requires an explicit max_tokens; use this when the caller omits it. */
const DEFAULT_MAX_TOKENS = 1024;

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`AnthropicAdapter: ${name} is not configured`);
  return value;
}

/** Build the Messages API payload shared by generate() and stream(). */
function toMessageParams(options: GenerateOptions) {
  const messages = options.messages ?? [
    { role: "user" as const, content: options.prompt ?? "" },
  ];
  return {
    model: options.model ?? DEFAULT_MODELS.anthropic,
    max_tokens: options.maxTokens ?? DEFAULT_MAX_TOKENS,
    ...(options.temperature !== undefined
      ? { temperature: options.temperature }
      : {}),
    ...(options.system ? { system: options.system } : {}),
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  };
}

export class AnthropicAdapter implements AiAdapter {
  readonly provider = "anthropic" as const;
  private readonly client: Anthropic;

  constructor(client?: Anthropic) {
    this.client =
      client ??
      new Anthropic({
        apiKey: required("ANTHROPIC_API_KEY", env.ANTHROPIC_API_KEY),
      });
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const params = toMessageParams(options);
    const message = await this.client.messages.create(params);
    const text = message.content
      .filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("");
    return { text, model: message.model, provider: this.provider };
  }

  async *stream(options: GenerateOptions): AsyncIterable<string> {
    const params = toMessageParams(options);
    const stream = this.client.messages.stream(params);
    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        yield event.delta.text;
      }
    }
  }
}
