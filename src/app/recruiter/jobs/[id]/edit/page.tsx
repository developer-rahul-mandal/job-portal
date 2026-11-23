import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { getRecruiterSession } from "@/lib/auth/recruiter";
import { prisma } from "@/lib/prisma";
import JobEditForm from "./job-edit-form";

export const metadata = {
  title: "Edit Job Posting | Recruiter Workspace",
};

interface EditJobPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function RecruiterJobEditPage({ params }: EditJobPageProps) {
  const session = await getRecruiterSession();

  if (!session || !session.company) {
    redirect("/recruiter/onboarding");
  }

  const { id } = await params;

  const [job, categories] = await Promise.all([
    prisma.job.findUnique({
      where: { id },
      include: {
        category: true,
      },
    }),
    prisma.category.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
      },
      orderBy: {
        name: "asc",
      },
    }),
  ]);

  if (!job) {
    notFound();
  }

  // Cross-company isolation enforcement
  if (job.companyId !== session.company.id) {
    redirect("/recruiter/jobs");
  }

  const serializedJob = {
    id: job.id,
    slug: job.slug,
    title: job.title,
    detailedTitle: job.detailedTitle,
    role: job.role,
    categoryId: job.categoryId,
    employmentType: job.employmentType,
    experienceLevel: job.experienceLevel,
    experienceYears: job.experienceYears ? Number(job.experienceYears) : null,
    location: job.location,
    shortDescription: job.shortDescription,
    description: job.description,
    qualifications: typeof job.qualifications === "string" ? job.qualifications : null,
    skills: Array.isArray(job.skills) ? (job.skills as string[]) : null,
    salaryMin: job.salaryMin ? Number(job.salaryMin) : null,
    salaryMax: job.salaryMax ? Number(job.salaryMax) : null,
    salaryCurrency: job.salaryCurrency,
    salaryPeriod: job.salaryPeriod,
    applicationMethod: job.applicationMethod,
    applicationUrl: job.applicationUrl,
    applicationEmail: job.applicationEmail,
    allowGuestApply: job.allowGuestApply,
    deadline: job.deadline ? job.deadline.toISOString() : null,
    status: job.status as "DRAFT" | "PUBLISHED" | "CLOSED",
  };

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
            <Link href="/recruiter/jobs" className="hover:underline">
              Job Postings
            </Link>
            <span>/</span>
            <span>Edit Position</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
            Edit Opportunity
          </h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Modify requirements, compensation, routing, or status for &ldquo;{job.detailedTitle || job.title}&rdquo;.
          </p>
        </div>

        {job.status === "PUBLISHED" && (
          <Link
            href={`/jobs/${job.slug}`}
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs transition-colors self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View Live Listing
          </Link>
        )}
      </div>

      <JobEditForm job={serializedJob} categories={categories} />
    </div>
  );
}
