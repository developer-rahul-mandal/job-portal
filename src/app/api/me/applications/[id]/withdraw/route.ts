import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { isValidStatusTransition } from "@/lib/application-lifecycle";

export const runtime = "nodejs";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    if (user.role !== "APPLICANT") {
      return errorResponse("Forbidden: Only applicants can withdraw applications.", 403);
    }

    const { id } = await params;

    if (!id) {
      return errorResponse("Application ID is required", 400);
    }

    const application = await prisma.application.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        jobId: true,
      },
    });

    if (!application) {
      return errorResponse("Application not found", 404);
    }

    // Ownership check
    if (application.userId !== user.id) {
      return errorResponse("Unauthorized: You do not own this application", 403);
    }

    // Validate lifecycle transition
    const validation = isValidStatusTransition(application.status, "WITHDRAWN", "APPLICANT");
    if (!validation.valid) {
      return errorResponse(validation.error || "Cannot withdraw this application", 400);
    }

    // Optional reason from body
    let reason = "Candidate withdrew application";
    try {
      const body = await request.json().catch(() => ({}));
      if (typeof body?.reason === "string" && body.reason.trim()) {
        reason = body.reason.trim().slice(0, 500);
      }
    } catch {
      // Body is optional
    }

    const updated = await prisma.$transaction(async (tx) => {
      const app = await tx.application.update({
        where: { id: application.id },
        data: {
          status: "WITHDRAWN",
        },
        select: {
          id: true,
          status: true,
          updatedAt: true,
        },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: application.id,
          previousStatus: application.status,
          newStatus: "WITHDRAWN",
          changedById: user.id,
          reason,
        },
      });

      return app;
    });

    return NextResponse.json({
      success: true,
      message: "Application withdrawn successfully.",
      data: updated,
    });
  } catch (err) {
    console.error("POST /api/me/applications/[id]/withdraw error:", err);
    return errorResponse("Failed to withdraw application", 500);
  }
}
