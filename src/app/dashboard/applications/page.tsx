import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ApplicationStatus, Prisma } from "@/generated/prisma/client";
import ApplicationsManager, { ApplicationItem } from "./applications-manager";

export const metadata = {
  title: "My Applications — JobPortal",
};

interface ApplicationsPageProps {
  searchParams: Promise<{
    status?: string;
    q?: string;
    page?: string;
  }>;
}

export default async function ApplicationsPage({ searchParams }: ApplicationsPageProps) {
  const user = await getServerSession();

  if (!user) {
    redirect("/login?redirect=/dashboard/applications");
  }

  if (user.role === "RECRUITER") {
    redirect("/recruiter/dashboard");
  }

  const resolvedParams = await searchParams;
  const statusParam = resolvedParams.status || "";
  const queryParam = resolvedParams.q || "";
  const page = Math.max(1, parseInt(resolvedParams.page || "1", 10));
  const limit = 10;
  const skip = (page - 1) * limit;

  const where: Prisma.ApplicationWhereInput = {
    userId: user.id,
  };

  if (statusParam && Object.values(ApplicationStatus).includes(statusParam as ApplicationStatus)) {
    where.status = statusParam as ApplicationStatus;
  }

  if (queryParam.trim()) {
    const q = queryParam.trim();
    where.OR = [
      { job: { title: { contains: q } } },
      { job: { shortDescription: { contains: q } } },
      { job: { company: { name: { contains: q } } } },
    ];
  }

  const [total, applications] = await Promise.all([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where,
      include: {
        job: {
          include: {
            company: {
              select: {
                id: true,
                name: true,
                slug: true,
                logo: true,
                verification: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  const totalPages = Math.ceil(total / limit) || 1;

  // Format serializable data
  const formattedApplications: ApplicationItem[] = applications.map((app) => ({
    id: app.id,
    status: app.status,
    coverLetter: app.coverLetter,
    resumeFileName: app.resumeFileName,
    resumeFileSize: app.resumeFileSize,
    resumeStorageKey: app.resumeStorageKey,
    profileSnapshot: app.profileSnapshot,
    createdAt: app.createdAt.toISOString(),
    updatedAt: app.updatedAt.toISOString(),
    job: {
      id: app.job.id,
      slug: app.job.slug,
      title: app.job.title,
      shortDescription: app.job.shortDescription,
      location: app.job.location,
      salaryMin: app.job.salaryMin ? Number(app.job.salaryMin) : null,
      salaryMax: app.job.salaryMax ? Number(app.job.salaryMax) : null,
      salaryCurrency: app.job.salaryCurrency,
      employmentType: app.job.employmentType,
      company: {
        id: app.job.company.id,
        name: app.job.company.name,
        slug: app.job.company.slug,
        logo: app.job.company.logo,
        verification: app.job.company.verification,
      },
      category: app.job.category,
    },
    statusHistory: app.statusHistory.map((h) => ({
      id: h.id,
      previousStatus: h.previousStatus,
      newStatus: h.newStatus,
      reason: h.reason,
      createdAt: h.createdAt.toISOString(),
    })),
  }));

  return (
    <ApplicationsManager
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
