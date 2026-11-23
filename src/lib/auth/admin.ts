import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getServerSession, AuthenticatedUser } from "./session";

/**
 * Validates admin access in React Server Components.
 */
export async function getAdminSession(): Promise<AuthenticatedUser | null> {
  const user = await getServerSession();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

/**
 * Validates admin access in API route handlers.
 * Superusers do not require company memberships.
 */
export async function requireAdminApi(
  request: NextRequest
): Promise<
  | { success: true; user: AuthenticatedUser }
  | { success: false; response: NextResponse }
> {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      ),
    };
  }

  if (user.role !== "ADMIN") {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, message: "Administrator access required." },
        { status: 403 }
      ),
    };
  }

  return { success: true, user };
}
