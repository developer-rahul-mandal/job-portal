import { redirect } from "next/navigation";
import Link from "next/link";
import { getRecruiterSession } from "@/lib/auth/recruiter";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@/generated/prisma/client";
import JobsManager from "./jobs-manager";

export const metadata = {
  title: "Job Postings | Recruiter Workspace",
};

interface RecruiterJobsPageProps {
  searchParams: Promise<{
    status?: string;
    q?: string;
    page?: string;
  }>;
}

export default async function RecruiterJobsPage({ searchParams }: RecruiterJobsPageProps) {
  const session = await getRecruiterSession();

  if (!session || !session.company) {
    redirect("/recruiter/onboarding");
  }

  const { company } = session;
  const params = await searchParams;

  const statusParam = params.status?.toUpperCase() || "";
  const queryParam = params.q?.trim() || "";
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const limit = 10;
  const skip = (page - 1) * limit;

  const validStatuses: JobStatus[] = [
    "DRAFT",
    "PENDING_REVIEW",
    "PUBLISHED",
    "REJECTED",
    "EXPIRED",
    "CLOSED",
  ];

  const where = {
    companyId: company.id,
    ...(statusParam && validStatuses.includes(statusParam as JobStatus)
      ? { status: statusParam as JobStatus }
      : {}),
    ...(queryParam
      ? {
          OR: [
            { title: { contains: queryParam } },
            { detailedTitle: { contains: queryParam } },
            { role: { contains: queryParam } },
            { location: { contains: queryParam } },
          ],
        }
      : {}),
  };

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        slug: true,
        title: true,
        detailedTitle: true,
        role: true,
        location: true,
        employmentType: true,
        status: true,
        applicationMethod: true,
        applicationCount: true,
        applyClickCount: true,
        publishedAt: true,
        deadline: true,
        createdAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    }),
    prisma.job.count({ where }),
  ]);

  const serializedJobs = jobs.map((j) => ({
    ...j,
    publishedAt: j.publishedAt ? j.publishedAt.toISOString() : null,
    deadline: j.deadline ? j.deadline.toISOString() : null,
    createdAt: j.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
            Job Postings
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Manage your company&apos;s active openings, drafts, closed positions, and applicant pipelines.
          </p>
        </div>

        <div>
          <Link
            href="/recruiter/jobs/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Post a New Job
          </Link>
        </div>
      </div>

      {/* Interactive Table & Manager */}
      <JobsManager
        initialJobs={serializedJobs}
        pagination={{
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        }}
        currentStatus={statusParam}
        currentQuery={queryParam}
      />
    </div>
  );
}
