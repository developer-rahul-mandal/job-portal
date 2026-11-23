import { NextRequest, NextResponse } from "next/server";
import { requireRecruiterApi } from "@/lib/auth/recruiter";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const auth = await requireRecruiterApi(request, { requireCompany: true });
  if (!auth.success) return auth.response;

  const { user, membership } = auth;

  if (membership.verificationStatus === "VERIFIED") {
    return NextResponse.json(
      { success: false, message: "Your recruiter identity is already verified." },
      { status: 400 }
    );
  }

  if (membership.verificationStatus === "PENDING") {
    return NextResponse.json(
      { success: false, message: "Your identity verification is already pending review." },
      { status: 400 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { notes } = body || {};

    const updated = await prisma.$transaction(async (tx) => {
      const rec = await tx.companyRecruiter.update({
        where: { id: membership.id },
        data: {
          verificationStatus: "PENDING",
          rejectedAt: null,
          rejectionReason: null,
        },
      });

      await tx.companyRecruiterVerificationHistory.create({
        data: {
          recruiterId: membership.id,
          previousStatus: membership.verificationStatus,
          newStatus: "PENDING",
          reviewedById: user.id,
          reason: typeof notes === "string" && notes.trim() ? notes.trim().slice(0, 500) : "Submitted by recruiter for verification",
        },
      });

      return rec;
    });

    return NextResponse.json({
      success: true,
      message: "Identity verification submitted for administrator review.",
      data: updated,
    });
  } catch (err) {
    console.error("RECRUITER_VERIFY_REQUEST_ERROR:", err);
    return NextResponse.json(
      { success: false, message: "Failed to submit recruiter verification." },
      { status: 500 }
    );
  }
}
