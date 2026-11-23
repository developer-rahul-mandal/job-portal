import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if (!auth.success) return auth.response;

  try {
    const [
      totalUsers,
      totalCompanies,
      pendingRecruitersCount,
      pendingCompaniesCount,
      pendingJobsCount,
      publishedJobsCount,
      totalApplicationsCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.company.count(),
      prisma.companyRecruiter.count({ where: { verificationStatus: "PENDING" } }),
      prisma.company.count({ where: { verification: "PENDING" } }),
      prisma.job.count({ where: { status: "PENDING_REVIEW" } }),
      prisma.job.count({ where: { status: "PUBLISHED" } }),
      prisma.application.count(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        totalUsers,
        totalCompanies,
        pendingRecruitersCount,
        pendingCompaniesCount,
        pendingJobsCount,
        publishedJobsCount,
        totalApplicationsCount,
      },
    });
  } catch (err) {
    console.error("ADMIN_METRICS_ERROR:", err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch admin metrics." },
      { status: 500 }
    );
  }
}
