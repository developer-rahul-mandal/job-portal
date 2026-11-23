import { NextRequest, NextResponse } from "next/server";
import { requireRecruiterApi } from "@/lib/auth/recruiter";
import { prisma } from "@/lib/prisma";
import { ApplicationStatus } from "@/generated/prisma/client";
import { isValidStatusTransition } from "@/lib/application-lifecycle";
import { notifyApplicationStatusChanged } from "@/lib/notifications";

export const runtime = "nodejs";

const VALID_STATUSES = Object.values(ApplicationStatus);

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRecruiterApi(request, { requireCompany: true });
    if (!auth.success) return auth.response;

    const { user, company } = auth;
    const { id } = await params;

    if (!id) {
      return errorResponse("Application ID is required.", 400);
    }

    const body: unknown = await request.json().catch(() => null);

    if (
      typeof body !== "object" ||
      body === null ||
      !("status" in body) ||
      typeof body.status !== "string"
    ) {
      return errorResponse("A valid target status is required.", 400);
    }

    const targetStatus = body.status.toUpperCase() as ApplicationStatus;

    if (!VALID_STATUSES.includes(targetStatus)) {
      return errorResponse("Invalid application status specified.", 400);
    }

    const reason =
      "reason" in body && typeof body.reason === "string" && body.reason.trim()
        ? body.reason.trim().slice(0, 500)
        : null;

    // 1. Resolve application and verify job ownership
    const application = await prisma.application.findUnique({
      where: { id },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            companyId: true,
            company: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!application) {
      return errorResponse("Application not found.", 404);
    }

    // Cross-company isolation
    if (application.job.companyId !== company.id) {
      return errorResponse(
        "Unauthorized: This application belongs to another company organization.",
        403
      );
    }

    // 2. Validate status transition with lifecycle rules
    const validation = isValidStatusTransition(
      application.status,
      targetStatus,
      "RECRUITER"
    );

    if (!validation.valid) {
      return errorResponse(validation.error || "Invalid status transition.", 400);
    }

    // 3. Update application status and record audit history
    const updated = await prisma.$transaction(async (tx) => {
      const app = await tx.application.update({
        where: { id: application.id },
        data: {
          status: targetStatus,
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
          newStatus: targetStatus,
          changedById: user.id,
          reason,
        },
      });

      return app;
    });

    // 4. Notify candidate asynchronously
    notifyApplicationStatusChanged({
      applicantEmail: application.applicantEmail,
      applicantName: application.applicantName,
      jobTitle: application.job.title,
      companyName: application.job.company.name,
      newStatus: targetStatus,
      reason,
    }).catch((err) => console.error("notifyApplicationStatusChanged error:", err));

    return NextResponse.json({
      success: true,
      message: `Candidate status updated to ${targetStatus}.`,
      data: updated,
    });
  } catch (err) {
    console.error("PATCH /api/recruiter/applications/[id]/status error:", err);
    return errorResponse("Failed to update candidate status.", 500);
  }
}
