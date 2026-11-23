import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi(request);
  if (!auth.success) return auth.response;

  const { user } = auth;
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { success: false, message: "Job ID is required." },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { reason } = body || {};

  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return NextResponse.json(
      { success: false, message: "Rejection reason is required." },
      { status: 400 }
    );
  }

  const job = await prisma.job.findUnique({
    where: { id },
    select: { id: true, title: true, status: true, company: { select: { name: true } } },
  });

  if (!job) {
    return NextResponse.json(
      { success: false, message: "Job not found." },
      { status: 404 }
    );
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const j = await tx.job.update({
        where: { id },
        data: {
          status: "REJECTED",
          rejectionReason: reason.trim().slice(0, 500),
        },
      });

      await tx.jobModerationHistory.create({
        data: {
          jobId: id,
          previousStatus: job.status,
          newStatus: "REJECTED",
          reviewedById: user.id,
          reason: reason.trim().slice(0, 500),
        },
      });

      return j;
    });

    return NextResponse.json({
      success: true,
      message: `Rejected job "${job.title}".`,
      data: updated,
    });
  } catch (err) {
    console.error("ADMIN_REJECT_JOB_ERROR:", err);
    return NextResponse.json(
      { success: false, message: "Failed to reject job." },
      { status: 500 }
    );
  }
}
