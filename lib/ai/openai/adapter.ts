/**
 * lib/ai/openai/adapter.ts — OpenAI implementation of AiAdapter.
 *
 * The only module that imports `openai`. Reads its key from the validated `env`
 * (never `process.env`, §4). Maps the provider-neutral GenerateOptions onto a
 * Chat Completions call — the `system` instruction becomes a leading system
 * message — and normalizes the response/stream back to plain text.
 */

import OpenAI from "openai";

import { env } from "@/config/env.schema";

import type { AiAdapter, GenerateOptions, GenerateResult } from "../adapter";
import { DEFAULT_MODELS } from "../models";

function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`OpenAiAdapter: ${name} is not configured`);
  return value;
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

/** Build the Chat Completions payload shared by generate() and stream(). */
function toChatParams(options: GenerateOptions) {
  const turns = options.messages ?? [
    { role: "user" as const, content: options.prompt ?? "" },
  ];
  const messages: ChatMessage[] = [
    ...(options.system
      ? [{ role: "system" as const, content: options.system }]
      : []),
    ...turns.map((m) => ({ role: m.role, content: m.content })),
  ];
  return {
    model: options.model ?? DEFAULT_MODELS.openai,
    messages,
    ...(options.maxTokens !== undefined
      ? { max_tokens: options.maxTokens }
      : {}),
    ...(options.temperature !== undefined
      ? { temperature: options.temperature }
      : {}),
  };
}

export class OpenAiAdapter implements AiAdapter {
  readonly provider = "openai" as const;
  private readonly client: OpenAI;

  constructor(client?: OpenAI) {
    this.client =
      client ??
      new OpenAI({ apiKey: required("OPENAI_API_KEY", env.OPENAI_API_KEY) });
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const completion = await this.client.chat.completions.create({
      ...toChatParams(options),
      stream: false,
    });
    const text = completion.choices[0]?.message?.content ?? "";
    return { text, model: completion.model, provider: this.provider };
  }

  async *stream(options: GenerateOptions): AsyncIterable<string> {
    const stream = await this.client.chat.completions.create({
      ...toChatParams(options),
      stream: true,
    });
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}
