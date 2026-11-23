import { redirect } from "next/navigation";
import Link from "next/link";
import { getRecruiterSession } from "@/lib/auth/recruiter";
import CompanyForm from "./company-form";

export const metadata = {
  title: "Company Profile | Recruiter Workspace",
};

export default async function RecruiterCompanyPage() {
  const session = await getRecruiterSession();

  if (!session || !session.company) {
    redirect("/recruiter/onboarding");
  }

  const { company, membership, user } = session;
  const canEdit =
    membership?.membershipRole === "OWNER" ||
    membership?.membershipRole === "ADMIN" ||
    user.role === "ADMIN";

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
            Company Profile
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage your corporate branding, headquarters, and public job portal presentation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/companies/${company.slug}`}
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-sm transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View Public Page
          </Link>
        </div>
      </div>

      {/* Verification Status Card */}
      <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="mt-0.5 sm:mt-0">
            {company.verification === "VERIFIED" && (
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {company.verification === "PENDING" && (
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            )}
            {company.verification === "UNVERIFIED" && (
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            )}
            {company.verification === "REJECTED" && (
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                Verification Status:
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                  company.verification === "VERIFIED"
                    ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                    : company.verification === "PENDING"
                    ? "bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-400"
                    : company.verification === "UNVERIFIED"
                    ? "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400"
                    : "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400"
                }`}
              >
                {company.verification}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {company.verification === "VERIFIED" &&
                "Your company is verified by JobPortal. You enjoy verified trust badges across all public job listings."}
              {company.verification === "PENDING" &&
                "Verification review is in progress by platform administrators."}
              {company.verification === "UNVERIFIED" &&
                "Your company is currently unverified. Jobs can still be published with standard unverified tags."}
              {company.verification === "REJECTED" &&
                "Verification was not approved. Please verify your official contact information or reach out to support."}
            </p>
          </div>
        </div>

        <div className="text-xs text-zinc-400">
          Member Role: <span className="font-semibold text-zinc-700 dark:text-zinc-300">{membership?.membershipRole}</span>
        </div>
      </div>

      {/* Main Company Form */}
      <CompanyForm company={company} canEdit={canEdit} />
    </div>
  );
}
