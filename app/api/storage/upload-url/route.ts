import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";
import { z } from "zod";

import { features } from "@/config/features";
import { authErrorResponse, authorize } from "@/lib/auth/roles";
import { storage } from "@/lib/storage";

const schema = z.object({
  filename: z.string().min(1).max(200),
  contentType: z.string().min(1).max(150),
});

/** Sanitise a client-supplied filename for use in an object key. */
function safeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100) || "file";
}

/** Mint a presigned upload URL scoped to the active org (storage only). */
export async function POST(request: Request): Promise<NextResponse> {
  if (!features.storage) {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  try {
    const session = await authorize();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid input" },
        { status: 400 },
      );
    }
    const scope = session.organizationId ?? session.user.id;
    const key = `uploads/${scope}/${randomUUID()}-${safeName(parsed.data.filename)}`;
    const { url } = await storage.getUploadUrl(key, parsed.data.contentType);
    return NextResponse.json({ ok: true, url, key });
  } catch (error) {
    return authErrorResponse(error);
  }
}
