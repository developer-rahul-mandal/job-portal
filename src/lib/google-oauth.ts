
import { OAuth2Client } from "google-auth-library";

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI;

if (!clientId || !clientSecret || !redirectUri) {
  throw new Error("Google OAuth environment variables are missing.");
}

export const googleOAuthClient = new OAuth2Client(
  clientId,
  clientSecret,
  redirectUri
);

export const GOOGLE_CLIENT_ID = clientId;
