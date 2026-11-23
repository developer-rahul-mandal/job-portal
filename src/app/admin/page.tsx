import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import AdminDashboard from "./admin-dashboard";
import LogoutButton from "@/components/auth/logout-button";
import ThemeToggle from "@/components/theme/theme-toggle";

export const metadata = {
  title: "Admin Moderation Console — JobPortal",
};

export default async function AdminPage() {
  const user = await getServerSession();

  if (!user) {
    redirect("/login?redirect=/admin");
  }

  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  const [
    totalUsers,
    totalCompanies,
    pendingRecruitersCount,
    pendingCompaniesCount,
    pendingJobsCount,
    publishedJobsCount,
    totalApplicationsCount,
    jobs,
    companies,
    recruiters,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.company.count(),
    prisma.companyRecruiter.count({ where: { verificationStatus: "PENDING" } }),
    prisma.company.count({ where: { verification: "PENDING" } }),
    prisma.job.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.job.count({ where: { status: "PUBLISHED" } }),
    prisma.application.count(),
    prisma.job.findMany({
      where: {
        status: { in: ["PENDING_REVIEW", "DRAFT", "REJECTED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        company: { select: { id: true, name: true, slug: true, logo: true, verification: true } },
        postedBy: { select: { id: true, name: true, email: true } },
        category: { select: { name: true } },
      },
    }),
    prisma.company.findMany({
      where: {
        verification: { in: ["PENDING", "UNVERIFIED", "REJECTED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        _count: { select: { jobs: true, recruiters: true } },
      },
    }),
    prisma.companyRecruiter.findMany({
      where: {
        verificationStatus: { in: ["PENDING", "UNVERIFIED", "REJECTED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        company: { select: { id: true, name: true, slug: true, logo: true, verification: true } },
      },
    }),
  ]);

  const serializedJobs = jobs.map((j) => ({
    id: j.id,
    title: j.title,
    slug: j.slug,
    role: j.role,
    location: j.location,
    employmentType: j.employmentType,
    status: j.status,
    applicationMethod: j.applicationMethod,
    createdAt: j.createdAt.toISOString(),
    rejectionReason: j.rejectionReason,
    company: j.company,
    postedBy: j.postedBy,
    category: j.category,
  }));

  const serializedCompanies = companies.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    logo: c.logo,
    location: c.location,
    website: c.website,
    normalizedDomain: c.normalizedDomain,
    officialEmail: c.officialEmail,
    verification: c.verification,
    createdAt: c.createdAt.toISOString(),
    _count: c._count,
  }));

  const serializedRecruiters = recruiters.map((r) => ({
    id: r.id,
    userId: r.userId,
    membershipRole: r.membershipRole,
    verificationStatus: r.verificationStatus,
    createdAt: r.createdAt.toISOString(),
    user: r.user,
    company: r.company,
  }));

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 font-extrabold text-[11px] uppercase tracking-wider">
                Platform Admin
              </span>
              <h1 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
                Moderation & Governance Workspace
              </h1>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              Signed in as {user.name || user.email} ({user.email})
            </p>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle variant="dropdown" />
            <LogoutButton />
          </div>
        </header>

        <AdminDashboard
          metrics={{
            totalUsers,
            totalCompanies,
            pendingRecruitersCount,
            pendingCompaniesCount,
            pendingJobsCount,
            publishedJobsCount,
            totalApplicationsCount,
          }}
          initialJobs={serializedJobs}
          initialCompanies={serializedCompanies}
          initialRecruiters={serializedRecruiters}
        />
      </div>
    </div>
  );
}
