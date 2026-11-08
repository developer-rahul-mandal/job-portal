
import {
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  googleOAuthClient,
  GOOGLE_CLIENT_ID,
} from "@/lib/google-oauth";

const SESSION_DURATION = 7 * 24 * 60 * 60;
const STATE_COOKIE = "google_oauth_state";

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function redirectToLogin(request: NextRequest, error: string) {
  const response = NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent(error)}`, request.url)
  );

  response.cookies.delete(STATE_COOKIE);

  return response;
}

function isPrismaUniqueConstraintError(
  error: unknown
): error is { code: "P2002" } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function GET(request: NextRequest) {
  try {
    const code = request.nextUrl.searchParams.get("code");
    const returnedState = request.nextUrl.searchParams.get("state");
    const storedState = request.cookies.get(STATE_COOKIE)?.value;

    if (
      !code ||
      !returnedState ||
      !storedState ||
      returnedState.length !== storedState.length ||
      !timingSafeEqual(
        Buffer.from(returnedState),
        Buffer.from(storedState)
      )
    ) {
      return redirectToLogin(request, "invalid_oauth_state");
    }

    const { tokens } = await googleOAuthClient.getToken(code);

    if (!tokens.id_token) {
      return redirectToLogin(request, "google_token_missing");
    }

    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (
      !payload ||
      !payload.sub ||
      !payload.email ||
      payload.email_verified !== true
    ) {
      return redirectToLogin(request, "google_email_not_verified");
    }

    const googleId = payload.sub;
    const email = payload.email.trim().toLowerCase();
    const name = payload.name?.trim() || null;

    const sessionToken = randomBytes(32).toString("hex");
    const tokenHash = hashSessionToken(sessionToken);

    const expiresAt = new Date(
      Date.now() + SESSION_DURATION * 1000
    );

    try {
      await prisma.$transaction(async (tx) => {
        const existingAccount = await tx.authAccount.findUnique({
          where: {
            provider_providerAccountId: {
              provider: "GOOGLE",
              providerAccountId: googleId,
            },
          },
          include: {
            user: true,
          },
        });

        let authenticatedUser;

        if (existingAccount) {
          authenticatedUser = existingAccount.user;

          if (!authenticatedUser.isActive) {
            throw new Error("USER_INACTIVE");
          }
        } else {
          const existingUser = await tx.user.findUnique({
            where: { email },
          });

          if (existingUser) {
            if (!existingUser.isActive) {
              throw new Error("USER_INACTIVE");
            }

            const existingGoogleAccount =
              await tx.authAccount.findUnique({
                where: {
                  userId_provider: {
                    userId: existingUser.id,
                    provider: "GOOGLE",
                  },
                },
              });

            if (existingGoogleAccount) {
              throw new Error("GOOGLE_ACCOUNT_ALREADY_LINKED");
            }

            authenticatedUser = await tx.user.update({
              where: { id: existingUser.id },
              data: {
                emailVerifiedAt:
                  existingUser.emailVerifiedAt ?? new Date(),
                name: existingUser.name ?? name,
              },
            });
          } else {
            authenticatedUser = await tx.user.create({
              data: {
                email,
                name,
                role: "APPLICANT",
                isActive: true,
                emailVerifiedAt: new Date(),
              },
            });
          }

          await tx.authAccount.create({
            data: {
              userId: authenticatedUser.id,
              provider: "GOOGLE",
              providerAccountId: googleId,
            },
          });
        }

        await tx.session.create({
          data: {
            userId: authenticatedUser.id,
            tokenHash,
            expiresAt,
          },
        });
      });
    } catch (error) {
      // Recover only if the Google identity was successfully
      // linked by another concurrent callback.
      if (isPrismaUniqueConstraintError(error)) {
        const linkedAccount = await prisma.authAccount.findUnique({
          where: {
            provider_providerAccountId: {
              provider: "GOOGLE",
              providerAccountId: googleId,
            },
          },
          include: {
            user: true,
          },
        });

        if (!linkedAccount) {
          throw error;
        }

        if (!linkedAccount.user.isActive) {
          throw new Error("USER_INACTIVE");
        }

        // The original transaction rolled back, so create
        // a fresh session for the recovered linked user.
        await prisma.session.create({
          data: {
            userId: linkedAccount.user.id,
            tokenHash,
            expiresAt,
          },
        });
      } else {
        throw error;
      }
    }

    const response = NextResponse.redirect(
      new URL("/", request.url)
    );

    response.cookies.delete(STATE_COOKIE);

    response.cookies.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION,
    });

    return response;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "USER_INACTIVE") {
        return redirectToLogin(request, "account_inactive");
      }

      if (error.message === "GOOGLE_ACCOUNT_ALREADY_LINKED") {
        return redirectToLogin(
          request,
          "google_account_already_linked"
        );
      }
    }

    console.error("Google OAuth callback error:", error);

    return redirectToLogin(request, "google_auth_failed");
  }
}
