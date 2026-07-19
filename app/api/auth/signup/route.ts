import { NextResponse } from "next/server";
import { z } from "zod";

import { features } from "@/config/features";
import { auth } from "@/lib/auth";
import { DEFAULT_AUTHED_PATH } from "@/lib/auth/constants";

const schema = z.object({
  email: z.email(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  name: z.string().optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  if (!features.auth.emailPassword) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  try {
    await auth.signUp(parsed.data);
    return NextResponse.json({ ok: true, redirect: DEFAULT_AUTHED_PATH });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
