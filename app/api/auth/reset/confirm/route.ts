import { NextResponse } from "next/server";
import { z } from "zod";

import { features } from "@/config/features";
import { auth } from "@/lib/auth";
import { LOGIN_PATH } from "@/lib/auth/constants";

const schema = z.object({
  token: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
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
    await auth.resetPassword(parsed.data);
    return NextResponse.json({ ok: true, redirect: LOGIN_PATH });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
