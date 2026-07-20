import { NextResponse } from "next/server";
import { z } from "zod";

import { features } from "@/config/features";
import { authErrorResponse, authorize } from "@/lib/auth/roles";
import { phone } from "@/lib/phone";

const schema = z.object({
  phone: z
    .string()
    .trim()
    .regex(/^\+?[0-9]{8,15}$/, "Enter a valid phone number"),
  code: z
    .string()
    .trim()
    .regex(/^[0-9]{4,10}$/, "Enter the code you received"),
});

/** Check a verification code (phoneVerification only). */
export async function POST(request: Request): Promise<NextResponse> {
  if (!features.phoneVerification) {
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
    const { approved, status } = await phone.checkVerification(
      parsed.data.phone,
      parsed.data.code,
    );
    return NextResponse.json({ ok: true, approved, status });
  } catch (error) {
    return authErrorResponse(error);
  }
}
