import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { LOGIN_PATH } from "@/lib/auth/constants";

export async function POST(): Promise<NextResponse> {
  await auth.signOut();
  return NextResponse.json({ ok: true, redirect: LOGIN_PATH });
}
