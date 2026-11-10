import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

export const ADMIN_SESSION_COOKIE = "mentor_admin_session";

export function configuredAdminPassword() {
  return process.env.ADMIN_PASSWORD || process.env.PARTY_A_TOKEN || "";
}

export function matchesAdminPassword(candidate: string | null | undefined) {
  const expected = configuredAdminPassword();
  if (!expected || !candidate) return false;
  const expectedBytes = Buffer.from(expected);
  const candidateBytes = Buffer.from(candidate);
  return expectedBytes.length === candidateBytes.length && timingSafeEqual(expectedBytes, candidateBytes);
}

export function hasAdminSession(request: NextRequest) {
  return matchesAdminPassword(request.cookies.get(ADMIN_SESSION_COOKIE)?.value);
}
