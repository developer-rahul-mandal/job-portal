import { NextRequest, NextResponse } from "next/server";
import { requireRecruiterApi } from "@/lib/auth/recruiter";
import { prisma } from "@/lib/prisma";
import { ApplicationStatus } from "@/generated/prisma/client";

export const runtime = "nodejs";

const VALID_STATUSES = Object.values(ApplicationStatus);

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. Authenticate recruiter and resolve company membership
    const auth = await requireRecruiterApi(request, { requireCompany: true });
    if (!auth.success) return auth.response;

    const { company } = auth;
    const { id } = await params;

    if (!id?.trim()) {
      return errorResponse("Job ID or slug is required.", 400);
    }

    // 2. Resolve job and enforce multi-tenant company ownership
    const job = await prisma.job.findFirst({
      where: {
        OR: [{ id: id.trim() }, { slug: id.trim() }],
      },
      select: {
        id: true,
        slug: true,
        title: true,
        detailedTitle: true,
        companyId: true,
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!job) {
      return errorResponse("Job not found.", 404);
    }

    // Cross-company isolation (return 404 to avoid leaking job existence)
    if (job.companyId !== company.id) {
      return errorResponse("Job not found.", 404);
    }

    // 3. Parse query filters and pagination
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, Number.parseInt(searchParams.get("limit") || "10", 10) || 10));
    const skip = (page - 1) * limit;

    const statusParam = searchParams.get("status")?.toUpperCase();
    const query = searchParams.get("q")?.trim();

    const where: {
      jobId: string;
      status?: ApplicationStatus;
      OR?: Array<Record<string, unknown>>;
    } = {
      jobId: job.id,
    };

    if (statusParam && VALID_STATUSES.includes(statusParam as ApplicationStatus)) {
      where.status = statusParam as ApplicationStatus;
    }

    if (query) {
      where.OR = [
        { applicantName: { contains: query } },
        { applicantEmail: { contains: query } },
      ];
    }

    // 4. Query paginated applications and total count
    const [total, applications] = await prisma.$transaction([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take: limit,
        select: {
          id: true,
          applicantName: true,
          applicantEmail: true,
          status: true,
          coverLetter: true,
          resumeFileName: true,
          resumeMimeType: true,
          resumeFileSize: true,
          profileSnapshot: true,
          createdAt: true,
          updatedAt: true,
          statusHistory: {
            orderBy: { createdAt: "desc" },
            take: 3,
            select: {
              id: true,
              previousStatus: true,
              newStatus: true,
              reason: true,
              createdAt: true,
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

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: {
        job: {
          id: job.id,
          slug: job.slug,
          title: job.detailedTitle || job.title,
          company: job.company,
        },
        applications,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1 && total > 0,
      },
    });
  } catch (err) {
    console.error("GET /api/recruiter/jobs/[id]/applications error:", err);
    return errorResponse("Failed to fetch job applications.", 500);
  }
}
