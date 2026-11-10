import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { configuredId, fetchAgreement, signAgreement, tokenParty } from "@/lib/agreement";
import { hasAdminSession } from "@/lib/admin-auth";

const schema = z.object({ party: z.enum(["mentor", "student"]), name: z.string().trim().min(1).max(120), image: z.string().regex(/^data:image\/png;base64,[A-Za-z0-9+/=]+$/).max(1_500_000), agreed: z.literal(true), evidence: z.object({ battery: z.object({ level: z.number().min(0).max(1), charging: z.boolean() }).optional(), location: z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180), accuracy: z.number().nonnegative() }).optional() }).optional() });

export async function POST(request: NextRequest) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter your name, draw a signature, and accept the voluntary terms." }, { status: 400 });
  const authorizedParty = tokenParty(request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  const party = authorizedParty ?? parsed.data.party;
  if (authorizedParty && authorizedParty !== parsed.data.party) return NextResponse.json({ error: "This signing link is for the other party." }, { status: 403 });
  if (party === "mentor" && !hasAdminSession(request)) return NextResponse.json({ error: "Sign in at /admin to submit the Mentor signature." }, { status: 401 });
  try {
    const id = configuredId();
    const current = fetchAgreement(id);
    if (!current || current.status === "withdrawn") return NextResponse.json({ error: "This agreement is unavailable." }, { status: 404 });
    if (current.status === "fully_signed") return NextResponse.json({ error: "This agreement has been executed and cannot be changed." }, { status: 409 });
    if (current[party]) return NextResponse.json({ error: "Your signature has already been recorded." }, { status: 409 });
    const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
    const signature = { name: parsed.data.name, image: parsed.data.image, signed_at: new Date().toISOString(), evidence: { user_agent: request.headers.get("user-agent") ?? undefined, ip: forwarded || request.headers.get("x-real-ip") || undefined, ...parsed.data.evidence } };
    // An immediate SQLite transaction serializes simultaneous signing attempts and computes status atomically.
    const saved = signAgreement(id, party, signature);
    return NextResponse.json({ agreement: saved });
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error && typeof error.statusCode === "number")
      return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save signature" }, { status: error.statusCode });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to save signature" }, { status: 503 });
  }
}
