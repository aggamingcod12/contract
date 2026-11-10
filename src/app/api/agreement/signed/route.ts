import { NextRequest, NextResponse } from "next/server";
import { configuredId, fetchAgreement, tokenParty } from "@/lib/agreement";
import { hasAdminSession } from "@/lib/admin-auth";

export async function GET(request: NextRequest) {
  const party = tokenParty(request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!party && !hasAdminSession(request)) return NextResponse.json({ error: "Sign in to view the completed agreement." }, { status: 401 });
  try {
    const agreement = fetchAgreement(configuredId());
    if (!agreement || agreement.status !== "fully_signed" || !agreement.mentor || !agreement.student)
      return NextResponse.json({ error: "Both signatures are required." }, { status: 403 });
    return NextResponse.json({ agreement });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Agreement unavailable" }, { status: 503 });
  }
}
