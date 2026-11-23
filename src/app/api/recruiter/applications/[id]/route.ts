import { NextRequest, NextResponse } from "next/server";
import { requireRecruiterApi } from "@/lib/auth/recruiter";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRecruiterApi(request, { requireCompany: true });
    if (!auth.success) return auth.response;

    const { company } = auth;
    const { id } = await params;

    if (!id) {
      return errorResponse("Application ID is required.", 400);
    }

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        job: {
          select: {
            id: true,
            slug: true,
            title: true,
            detailedTitle: true,
            companyId: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: "desc" },
          include: {
            changedBy: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    if (!application) {
      return errorResponse("Application not found.", 404);
    }

    // Cross-company isolation: Confirm the job belongs to recruiter's active company
    // Return 404 to avoid leaking existence of applications belonging to other companies
    if (application.job.companyId !== company.id) {
      return errorResponse("Application not found.", 404);
    }

    // Security DTO: Omit internal disk storage key from API responses
    const safeApplication = { ...application };
    delete (safeApplication as { resumeStorageKey?: string | null }).resumeStorageKey;

    return NextResponse.json({
      success: true,
      data: safeApplication,
    });
  } catch (err) {
    console.error("GET /api/recruiter/applications/[id] error:", err);
    return errorResponse("Failed to fetch application details.", 500);
  }
}
