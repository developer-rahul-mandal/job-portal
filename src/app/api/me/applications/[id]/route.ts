import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const runtime = "nodejs";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    if (user.role !== "APPLICANT") {
      return errorResponse("Forbidden", 403);
    }

    const { id } = await params;

    if (!id) {
      return errorResponse("Application ID is required", 400);
    }

    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        statusHistory: {
          orderBy: { createdAt: "desc" },
          include: {
            changedBy: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
        },
        job: {
          select: {
            id: true,
            slug: true,
            title: true,
            detailedTitle: true,
            role: true,
            location: true,
            employmentType: true,
            experienceLevel: true,
            salaryMin: true,
            salaryMax: true,
            salaryCurrency: true,
            salaryPeriod: true,
            status: true,
            publishedAt: true,
            company: {
              select: {
                id: true,
                name: true,
                slug: true,
                logo: true,
                location: true,
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
      },
    });

    if (!application) {
      return errorResponse("Application not found", 404);
    }

    // User ownership verification
    if (application.userId !== user.id) {
      return errorResponse("Unauthorized: You do not own this application", 403);
    }

    return NextResponse.json({
      success: true,
      data: application,
    });
  } catch (err) {
    console.error("GET /api/me/applications/[id] error:", err);
    return errorResponse("Failed to fetch application details", 500);
  }
}
