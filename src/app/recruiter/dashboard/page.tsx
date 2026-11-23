import Link from "next/link";
import { redirect } from "next/navigation";
import { getRecruiterSession } from "@/lib/auth/recruiter";
import { prisma } from "@/lib/prisma";
import VerificationCards from "@/components/recruiter/verification-cards";

export const metadata = {
  title: "Recruiter Dashboard — JobPortal",
};

export default async function RecruiterDashboardPage() {
  const session = await getRecruiterSession();

  if (!session || !session.company || !session.membership) {
    redirect("/recruiter/onboarding");
  }

  const { company, membership, user } = session;
  const now = new Date();

  // Authoritative metrics query
  const [
    activeJobsCount,
    draftJobsCount,
    totalJobsCount,
    totalApplications,
    applyClicksData,
    recentJobs,
    teamCount,
  ] = await Promise.all([
    prisma.job.count({
      where: {
        companyId: company.id,
        status: "PUBLISHED",
        OR: [{ deadline: null }, { deadline: { gt: now } }],
      },
    }),
    prisma.job.count({
      where: {
        companyId: company.id,
        status: "DRAFT",
      },
    }),
    prisma.job.count({
      where: {
        companyId: company.id,
      },
    }),
    // Authoritative total application count from Application table
    prisma.application.count({
      where: {
        job: { companyId: company.id },
      },
    }),
    prisma.job.aggregate({
      where: { companyId: company.id },
      _sum: {
        applyClickCount: true,
      },
    }),
    prisma.job.findMany({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        category: {
          select: { name: true },
        },
      },
    }),
    prisma.companyRecruiter.count({
      where: { companyId: company.id, status: "ACTIVE" },
    }),
  ]);

  const totalApplyClicks = applyClicksData._sum.applyClickCount ?? 0;

  const canEditCompany =
    membership.membershipRole === "OWNER" ||
    membership.membershipRole === "ADMIN" ||
    user.role === "ADMIN";

  return (
    <div className="space-y-8">
      {/* Welcome Banner */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-2xl shadow-sm shrink-0 overflow-hidden">
              {company.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={company.logo} alt={company.name} className="w-full h-full object-cover" />
              ) : (
                company.name.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {company.name}
                </h1>
                {company.verification === "VERIFIED" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Verified Employer
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                    {company.verification === "PENDING" ? "Verification Pending" : "Unverified Employer"}
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                Recruiter Workspace • Logged in as <strong>{user.name || user.email}</strong> ({membership.membershipRole})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/companies/${company.slug}`}
              target="_blank"
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
            >
              Public Profile ↗
            </Link>
            <Link
              href="/recruiter/jobs/new"
              className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Post a New Job
            </Link>
          </div>
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
        canManageCompany={canEditCompany}
      />

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
            <span>ACTIVE OPENINGS</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
              {activeJobsCount}
            </span>
            <span className="text-xs text-zinc-400 ml-2">/ {totalJobsCount} total</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
            <span>DRAFT POSITIONS</span>
            <div className="w-8 h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
              {draftJobsCount}
            </span>
            <span className="text-xs text-zinc-400 ml-2">unpublished</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
            <span>OUTBOUND APPLY CLICKS</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
              {totalApplyClicks}
            </span>
            <span className="text-xs text-zinc-400 ml-2">external</span>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
          <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400 text-xs font-semibold">
            <span>PORTAL APPLICATIONS</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-3xl font-extrabold text-zinc-900 dark:text-zinc-50">
              {totalApplications}
            </span>
            <span className="text-xs text-zinc-400 ml-2">internal</span>
          </div>
        </div>
      </div>

      {/* Recent Jobs Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Recent Job Postings
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Positions recently created or updated by your recruitment team
            </p>
          </div>
          <Link
            href="/recruiter/jobs"
            className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
          >
            View all jobs ({totalJobsCount}) →
          </Link>
        </div>

        {recentJobs.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">No jobs posted yet</p>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              Create your first job posting to start receiving applications from qualified candidates.
            </p>
            <div className="mt-4">
              <Link
                href="/recruiter/jobs/new"
                className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 shadow-sm transition"
              >
                Post Your First Job
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-600 dark:text-zinc-400">
              <thead className="bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500 dark:text-zinc-400 uppercase font-semibold text-[10px] tracking-wider border-b border-zinc-100 dark:border-zinc-800">
                <tr>
                  <th className="py-3 px-6">Job Title</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Clicks</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800/60 font-medium">
                {recentJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition">
                    <td className="py-3.5 px-6 font-semibold text-zinc-900 dark:text-zinc-100">
                      <Link href={`/recruiter/jobs/${job.id}/edit`} className="hover:text-blue-600 dark:hover:text-blue-400">
                        {job.detailedTitle || job.title}
                      </Link>
                      <p className="text-[11px] font-normal text-zinc-400 mt-0.5">{job.location}</p>
                    </td>
                    <td className="py-3.5 px-4">{job.category?.name || "General"}</td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {job.applicationMethod}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          job.status === "PUBLISHED"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                            : job.status === "DRAFT"
                            ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                            : "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300"
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">{job.applyClickCount}</td>
                    <td className="py-3.5 px-4">
                      {new Date(job.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </td>
                    <td className="py-3.5 px-6 text-right space-x-2">
                      <Link
                        href={`/recruiter/jobs/${job.id}/edit`}
                        className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Edit
                      </Link>
                      {job.status === "PUBLISHED" && (
                        <Link
                          href={`/jobs/${job.slug}`}
                          target="_blank"
                          className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                        >
                          View ↗
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Quick Access Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Company Profile</h3>
            <p className="text-xs text-zinc-500 mt-1">Update brand information, logo, overview and website link.</p>
            <div className="mt-4">
              <Link
                href="/recruiter/company"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                Manage Company →
              </Link>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Team Collaboration</h3>
            <p className="text-xs text-zinc-500 mt-1">
              Currently {teamCount} active {teamCount === 1 ? "recruiter" : "recruiters"} in your organization.
            </p>
            <div className="mt-4">
              <Link
                href="/recruiter/team"
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
              >
                Manage Team Members →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
