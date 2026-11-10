import { NextResponse } from "next/server";
import { configuredId, getOrCreateAgreement } from "@/lib/agreement";

export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const agreement = getOrCreateAgreement(configuredId());
    if (agreement) {
      const safe = { ...agreement, mentor: agreement.mentor ? { ...agreement.mentor, image: "", evidence: undefined } : null, student: agreement.student ? { ...agreement.student, image: "", evidence: undefined } : null };
      return NextResponse.json({ agreement: safe });
    }
    return NextResponse.json({ agreement });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Agreement unavailable" }, { status: 503 });
  }
}
