import { notFound, redirect } from "next/navigation";
import { getRecruiterSession } from "@/lib/auth/recruiter";
import { prisma } from "@/lib/prisma";
import { ApplicationStatus, Prisma } from "@/generated/prisma/client";
import CandidatesManager, { CandidateApplicationItem } from "./candidates-manager";

export const metadata = {
  title: "Candidate Applications | Recruiter Workspace",
};

interface CandidatesPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    status?: string;
    q?: string;
    page?: string;
  }>;
}

export default async function RecruiterJobApplicationsPage({
  params,
  searchParams,
}: CandidatesPageProps) {
  const session = await getRecruiterSession();

  const { id: rawJobId } = await params;
  const jobIdOrSlug = rawJobId?.trim();

  if (!session || !session.company) {
    redirect(`/login?redirect=/recruiter/jobs/${jobIdOrSlug}/applications`);
  }

  const { company } = session;

  if (!jobIdOrSlug) {
    redirect("/recruiter/jobs");
  }

  // 1. Fetch Job and verify multi-tenant isolation
  const job = await prisma.job.findFirst({
    where: {
      OR: [{ id: jobIdOrSlug }, { slug: jobIdOrSlug }],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      role: true,
      location: true,
      status: true,
      applicationMethod: true,
      companyId: true,
      company: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  if (!job) {
    notFound();
  }

  // Multi-tenant check: Company must match
  if (job.companyId !== company.id) {
    redirect("/recruiter/jobs");
  }

  // 2. Parse search parameters
  const queryParams = await searchParams;
  const statusParam = queryParams.status?.toUpperCase() || "";
  const queryParam = queryParams.q?.trim() || "";
  const page = Math.max(1, parseInt(queryParams.page || "1", 10));
  const limit = 10;
  const skip = (page - 1) * limit;

  const where: Prisma.ApplicationWhereInput = {
    jobId: job.id,
  };

  if (statusParam && Object.values(ApplicationStatus).includes(statusParam as ApplicationStatus)) {
    where.status = statusParam as ApplicationStatus;
  }

  if (queryParam) {
    where.OR = [
      { applicantName: { contains: queryParam } },
      { applicantEmail: { contains: queryParam } },
    ];
  }

  const [total, applications] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      skip,
      take: limit,
      include: {
        statusHistory: {
          orderBy: { createdAt: "desc" },
          include: {
            changedBy: {
              select: {
                name: true,
                role: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  // Format candidate application data
  const formattedApplications: CandidateApplicationItem[] = applications.map((app) => ({
    id: app.id,
    applicantName: app.applicantName,
    applicantEmail: app.applicantEmail,
    status: app.status,
    coverLetter: app.coverLetter,
    resumeFileName: app.resumeFileName,
    resumeFileSize: app.resumeFileSize,
    resumeMimeType: app.resumeMimeType,
    profileSnapshot: app.profileSnapshot,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
    statusHistory: app.statusHistory.map((h) => ({
      id: h.id,
      previousStatus: h.previousStatus,
      newStatus: h.newStatus,
      reason: h.reason,
      createdAt: h.createdAt.toISOString(),
      changedBy: h.changedBy
        ? {
            name: h.changedBy.name,
            role: h.changedBy.role,
          }
        : null,
    })),
  }));

  return (
    <CandidatesManager
      job={{
        id: job.id,
        slug: job.slug,
        title: job.title,
        role: job.role,
        location: job.location,
        status: job.status,
        applicationMethod: job.applicationMethod,
        company: job.company,
      }}
      initialApplications={formattedApplications}
      pagination={{
        page,
        limit,
        total,
        totalPages,
      }}
      currentStatus={statusParam}
      currentQuery={queryParam}
    />
  );
}
