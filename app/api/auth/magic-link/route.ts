import { NextResponse } from "next/server";
import { z } from "zod";

import { features } from "@/config/features";
import { auth } from "@/lib/auth";

const schema = z.object({ email: z.email() });

export async function POST(request: Request): Promise<NextResponse> {
  if (!features.auth.magicLink) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }
  try {
    await auth.sendMagicLink(parsed.data.email);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
}
