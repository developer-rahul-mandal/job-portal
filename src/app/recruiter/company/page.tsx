import { redirect } from "next/navigation";
import Link from "next/link";
import { getRecruiterSession } from "@/lib/auth/recruiter";
import CompanyForm from "./company-form";
import VerificationCards from "@/components/recruiter/verification-cards";

export const metadata = {
  title: "Company Profile | Recruiter Workspace",
};

export default async function RecruiterCompanyPage() {
  const session = await getRecruiterSession();

  if (!session || !session.company || !session.membership) {
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

      {/* Verification Status Cards */}
      <VerificationCards
        company={{
          id: company.id,
          name: company.name,
          verification: company.verification,
        }}
        membership={{
          id: membership.id,
          membershipRole: membership.membershipRole,
          verificationStatus: membership.verificationStatus,
          rejectionReason: membership.rejectionReason,
        }}
        canManageCompany={canEdit}
      />

      {/* Main Company Form */}
      <CompanyForm company={company} canEdit={canEdit} />
    </div>
  );
}
