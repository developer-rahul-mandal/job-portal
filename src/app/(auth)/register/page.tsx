import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { sanitizeRedirectPath } from "@/lib/auth/redirects";
import { RegisterForm } from "./register-form";

export const metadata = {
  title: "Create an Account — JobPortal",
  description: "Sign up for a free JobPortal account as a Job Seeker or Recruiter.",
};

type PageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function RegisterPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;

  const rawRedirect = typeof resolvedSearchParams.redirect === "string"
    ? resolvedSearchParams.redirect
    : null;

  // Check if session already exists
  const user = await getServerSession();

  if (user) {
    const destination = sanitizeRedirectPath(rawRedirect, user.role);
    redirect(destination);
  }

  return <RegisterForm redirectParam={rawRedirect} />;
}
