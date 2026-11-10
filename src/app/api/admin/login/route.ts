import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { ADMIN_SESSION_COOKIE, configuredAdminPassword, matchesAdminPassword } from "@/lib/admin-auth";

const schema = z.object({ password: z.string().min(1).max(500) });

export async function POST(request: NextRequest) {
  if (!configuredAdminPassword()) {
    return NextResponse.json({ error: "Set ADMIN_PASSWORD or PARTY_A_TOKEN in the server environment." }, { status: 503 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success || !matchesAdminPassword(parsed.data?.password)) {
    return NextResponse.json({ error: "Incorrect admin password." }, { status: 401 });
  }

  const response = NextResponse.json({ authenticated: true });
  response.cookies.set(ADMIN_SESSION_COOKIE, configuredAdminPassword(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ authenticated: false });
  response.cookies.set(ADMIN_SESSION_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 0 });
  return response;
}
