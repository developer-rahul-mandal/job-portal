import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js 16 Proxy convention (successor to deprecated middleware.ts).
 * Performs lightweight, fast edge checks on protected route groups.
 *
 * Full authoritative database-backed session validation and role authorization
 * are enforced in server-side layouts, server components, and API handlers.
 */
export function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get("session")?.value;

  // Session tokens are 32 random bytes encoded as 64 hex characters
  const hasValidTokenFormat =
    typeof sessionCookie === "string" &&
    sessionCookie.length === 64 &&
    /^[0-9a-f]{64}$/i.test(sessionCookie);

  if (!hasValidTokenFormat) {
    const loginUrl = new URL("/login", request.url);
    const destination = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    loginUrl.searchParams.set("redirect", destination);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/recruiter/:path*",
    "/admin/:path*",
  ],
};
