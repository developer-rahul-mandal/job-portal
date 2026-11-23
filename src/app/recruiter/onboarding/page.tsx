import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import OnboardingForm from "./onboarding-form";

export const metadata = {
  title: "Company Setup & Onboarding — JobPortal Recruiter",
};

export default async function RecruiterOnboardingPage() {
  const user = await getServerSession();

  if (!user) {
    redirect("/login?redirect=/recruiter/onboarding");
  }

  // Check if recruiter already has an active company
  const existingMembership = await prisma.companyRecruiter.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
    },
  });

  if (existingMembership) {
    redirect("/recruiter/dashboard");
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="text-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto mb-3 shadow-xs">
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
          Set Up Your Company Profile
        </h1>
        <p className="mt-2 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 max-w-md mx-auto leading-relaxed">
          To start posting job openings and managing applicants, register your corporate entity or organization.
        </p>
      </div>

      <OnboardingForm />
    </div>
  );
}
