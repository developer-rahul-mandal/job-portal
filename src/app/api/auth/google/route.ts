
import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { googleOAuthClient } from "@/lib/google-oauth";

const STATE_COOKIE = "google_oauth_state";

export async function GET(request: NextRequest) {
  const state = randomBytes(32).toString("hex");

  const authorizationUrl = googleOAuthClient.generateAuthUrl({
    access_type: "online",
    scope: ["openid", "email", "profile"],
    state,
    prompt: "select_account",
  });

  const response = NextResponse.redirect(authorizationUrl);

  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return response;
}
