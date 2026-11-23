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
      { success: false, message: "Recruiter membership ID is required." },
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

  const membership = await prisma.companyRecruiter.findUnique({
    where: { id },
    include: {
      user: { select: { name: true, email: true } },
      company: { select: { name: true } },
    },
  });

  if (!membership) {
    return NextResponse.json(
      { success: false, message: "Recruiter membership not found." },
      { status: 404 }
    );
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const rec = await tx.companyRecruiter.update({
        where: { id },
        data: {
          verificationStatus: "REJECTED",
          rejectedAt: new Date(),
          rejectionReason: reason.trim().slice(0, 500),
          reviewedById: user.id,
        },
      });

      await tx.companyRecruiterVerificationHistory.create({
        data: {
          recruiterId: id,
          previousStatus: membership.verificationStatus,
          newStatus: "REJECTED",
          reviewedById: user.id,
          reason: reason.trim().slice(0, 500),
        },
      });

      return rec;
    });

    return NextResponse.json({
      success: true,
      message: `Rejected recruiter verification for ${membership.user.name || membership.user.email}.`,
      data: updated,
    });
  } catch (err) {
    console.error("ADMIN_REJECT_RECRUITER_ERROR:", err);
    return NextResponse.json(
      { success: false, message: "Failed to reject recruiter verification." },
      { status: 500 }
    );
  }
}
