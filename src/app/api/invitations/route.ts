import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createSigningInvite, type Party } from "@/lib/agreement";

const requestSchema = z.object({ party: z.enum(["mentor", "student"]) });

export async function POST(request: NextRequest) {
  const expected = process.env.INVITATION_ADMIN_TOKEN;
  const supplied = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!expected) return NextResponse.json({ error: "Invitation generation is not configured." }, { status: 503 });
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  if (expectedBytes.length !== suppliedBytes.length || !timingSafeEqual(expectedBytes, suppliedBytes))
    return NextResponse.json({ error: "Owner access is required to create signing links." }, { status: 401 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Choose a signing party." }, { status: 400 });
  try {
    const party: Party = parsed.data.party;
    const token = createSigningInvite(party);
    const baseUrl = (process.env.APP_URL || request.nextUrl.origin).replace(/\/$/, "");
    return NextResponse.json({ party, url: `${baseUrl}/#access=${token}` }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Could not create the invitation. Please try again." }, { status: 503 });
  }
}
