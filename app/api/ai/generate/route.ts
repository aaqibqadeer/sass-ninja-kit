/**
 * app/api/ai/generate/route.ts — example AI completion route (Phase 8).
 *
 * A smoke test proving the `@/lib/ai` seam works end to end, not a full feature.
 * Follows the repo route contract: flag-check → 404 when off, `authorize()`,
 * Zod-validate the body, call the adapter, return `{ ok, ... }`.
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { AI_PROVIDERS, isAnyAiEnabled } from "@/config/features";
import { authErrorResponse, authorize } from "@/lib/auth/roles";
import { ai } from "@/lib/ai";

const schema = z.object({
  prompt: z.string().trim().min(1, "Prompt is required").max(8000),
  provider: z.enum(AI_PROVIDERS).optional(),
  system: z.string().trim().max(4000).optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  if (!isAnyAiEnabled) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  try {
    await authorize();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    const { prompt, provider, system } = parsed.data;
    const result = await ai(provider).generate({ prompt, system });
    return NextResponse.json({
      ok: true,
      text: result.text,
      model: result.model,
      provider: result.provider,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
