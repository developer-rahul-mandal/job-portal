import { NextRequest, NextResponse } from "next/server";
import { requireRecruiterApi } from "@/lib/auth/recruiter";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRecruiterApi(request, {
    requireCompany: true,
    requireOwnerOrAdmin: true,
  });
  if (!auth.success) return auth.response;

  const { user, company } = auth;
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { success: false, message: "Join request ID is required." },
      { status: 400 }
    );
  }

  const joinRequest = await prisma.companyJoinRequest.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  if (!joinRequest || joinRequest.companyId !== company.id) {
    return NextResponse.json(
      { success: false, message: "Join request not found for this company." },
      { status: 404 }
    );
  }

  if (joinRequest.status !== "PENDING") {
    return NextResponse.json(
      { success: false, message: `Request is already ${joinRequest.status.toLowerCase()}.` },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Mark join request approved
      const updatedRequest = await tx.companyJoinRequest.update({
        where: { id },
        data: {
          status: "APPROVED",
          reviewedById: user.id,
        },
      });

      // Upsert recruiter membership
      const membership = await tx.companyRecruiter.upsert({
        where: {
          userId_companyId: {
            userId: joinRequest.userId,
            companyId: company.id,
          },
        },
        create: {
          userId: joinRequest.userId,
          companyId: company.id,
          membershipRole: "RECRUITER",
          status: "ACTIVE",
          verificationStatus: "UNVERIFIED",
        },
        update: {
          status: "ACTIVE",
          membershipRole: "RECRUITER",
        },
      });

      return { updatedRequest, membership };
    });

    return NextResponse.json({
      success: true,
      message: `Approved ${joinRequest.user.name || joinRequest.user.email} to join the recruiter team.`,
      data: result,
    });
  } catch (err) {
    console.error("APPROVE_JOIN_REQUEST_ERROR:", err);
    return NextResponse.json(
      { success: false, message: "Failed to approve join request." },
      { status: 500 }
    );
  }
}
