import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";

import { prisma } from "@/lib/prisma";

export type AuthenticatedUser = {
  id: string;
  name: string | null;
  email: string;
  role: "APPLICANT" | "RECRUITER" | "ADMIN";
  isActive: boolean;
  emailVerifiedAt: Date | null;
};

/**
 * Validates an opaque session token against the database.
 * Returns the authenticated user or null if invalid, expired, revoked, or inactive.
 */
export async function validateSessionToken(
  sessionToken: string | undefined | null,
): Promise<AuthenticatedUser | null> {
  if (
    !sessionToken ||
    typeof sessionToken !== "string" ||
    sessionToken.length !== 64 ||
    !/^[0-9a-f]{64}$/i.test(sessionToken)
  ) {
    return null;
  }

  const tokenHash = createHash("sha256")
    .update(sessionToken)
    .digest("hex");

  const session = await prisma.session.findUnique({
    where: { tokenHash },
    select: {
      expiresAt: true,
      revokedAt: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true,
          emailVerifiedAt: true,
        },
      },
    },
  });

  if (
    !session ||
    session.revokedAt ||
    session.expiresAt <= new Date() ||
    !session.user.isActive
  ) {
    return null;
  }

  return session.user;
}

/**
 * Retrieves the authenticated user from a NextRequest cookie.
 * Used primarily in API route handlers.
 */
export async function getAuthenticatedUser(
  request: NextRequest,
): Promise<AuthenticatedUser | null> {
  const sessionToken = request.cookies.get("session")?.value;
  return validateSessionToken(sessionToken);
}

/**
 * Retrieves the authenticated user from the Server Component cookie store.
 * Used in React Server Components and layouts.
 */
export async function getServerSession(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;
    return validateSessionToken(sessionToken);
  } catch {
    return null;
  }
}
