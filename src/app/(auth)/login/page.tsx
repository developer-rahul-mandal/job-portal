import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { sanitizeRedirectPath } from "@/lib/auth/redirects";
import { LoginForm } from "./login-form";

export const metadata = {
  title: "Sign In — JobPortal",
  description: "Sign in to your JobPortal account with passwordless email OTP or Google.",
};

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function LoginPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;

  const rawRedirect = typeof resolvedSearchParams.redirect === "string"
    ? resolvedSearchParams.redirect
    : null;

  const rawError = typeof resolvedSearchParams.error === "string"
    ? resolvedSearchParams.error
    : null;

  // Check if session already exists
  const user = await getServerSession();

  if (user) {
    const destination = sanitizeRedirectPath(rawRedirect, user.role);
    redirect(destination);
  }

  return (
    <LoginForm
      redirectParam={rawRedirect}
      oauthError={rawError}
    />
  );
}
