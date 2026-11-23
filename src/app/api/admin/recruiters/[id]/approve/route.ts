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
          verificationStatus: "VERIFIED",
          verifiedAt: new Date(),
          rejectedAt: null,
          rejectionReason: null,
          reviewedById: user.id,
        },
      });

      await tx.companyRecruiterVerificationHistory.create({
        data: {
          recruiterId: id,
          previousStatus: membership.verificationStatus,
          newStatus: "VERIFIED",
          reviewedById: user.id,
          reason: "Approved by platform administrator",
        },
      });

      return rec;
    });

    return NextResponse.json({
      success: true,
      message: `Verified recruiter ${membership.user.name || membership.user.email} for ${membership.company.name}.`,
      data: updated,
    });
  } catch (err) {
    console.error("ADMIN_APPROVE_RECRUITER_ERROR:", err);
    return NextResponse.json(
      { success: false, message: "Failed to approve recruiter verification." },
      { status: 500 }
    );
  }
}
