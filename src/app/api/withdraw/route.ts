import { NextRequest, NextResponse } from "next/server";
import { configuredId, withdrawAgreement, tokenParty } from "@/lib/agreement";

export async function POST(request: NextRequest) {
  const party = tokenParty(request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null);
  if (!party) return NextResponse.json({ error: "A valid personal signing link is required." }, { status: 401 });

  try {
    const agreement = withdrawAgreement(configuredId(), party);
    return NextResponse.json({ agreement });
  } catch (error) {
    if (error && typeof error === "object" && "statusCode" in error && typeof error.statusCode === "number") {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to withdraw agreement" }, { status: error.statusCode });
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to withdraw agreement" }, { status: 503 });
  }
}
