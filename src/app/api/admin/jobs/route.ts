import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if (!auth.success) return auth.response;

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status")?.toUpperCase();

  const where: { status?: JobStatus } = {};
  if (
    statusParam &&
    ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "REJECTED", "EXPIRED", "CLOSED"].includes(statusParam)
  ) {
    where.status = statusParam as JobStatus;
  }

  try {
    const jobs = await prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
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
        postedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        moderationHistory: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
        _count: {
          select: {
            applications: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: jobs,
    });
  } catch (err) {
    console.error("ADMIN_JOBS_ERROR:", err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch jobs." },
      { status: 500 }
    );
  }
}
