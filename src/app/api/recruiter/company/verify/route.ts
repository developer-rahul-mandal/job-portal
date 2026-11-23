import { NextRequest, NextResponse } from "next/server";
import { requireRecruiterApi } from "@/lib/auth/recruiter";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const auth = await requireRecruiterApi(request, {
    requireCompany: true,
    requireOwnerOrAdmin: true,
  });
  if (!auth.success) return auth.response;

  const { user, company } = auth;

  if (company.verification === "VERIFIED") {
    return NextResponse.json(
      { success: false, message: "This company is already verified." },
      { status: 400 }
    );
  }

  if (company.verification === "PENDING") {
    return NextResponse.json(
      { success: false, message: "Company verification is already pending review." },
      { status: 400 }
    );
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { notes } = body || {};

    const updated = await prisma.$transaction(async (tx) => {
      const comp = await tx.company.update({
        where: { id: company.id },
        data: {
          verification: "PENDING",
        },
      });

      await tx.companyVerificationHistory.create({
        data: {
          companyId: company.id,
          previousStatus: company.verification,
          newStatus: "PENDING",
          reviewedById: user.id,
          reason: typeof notes === "string" && notes.trim() ? notes.trim().slice(0, 500) : "Submitted by company administrator for verification",
        },
      });

      return comp;
    });

    return NextResponse.json({
      success: true,
      message: "Company verification request submitted for administrator review.",
      data: updated,
    });
  } catch (err) {
    console.error("COMPANY_VERIFY_REQUEST_ERROR:", err);
    return NextResponse.json(
      { success: false, message: "Failed to submit company verification." },
      { status: 500 }
    );
  }
}
