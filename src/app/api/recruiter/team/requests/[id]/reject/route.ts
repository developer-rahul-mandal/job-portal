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

  await prisma.companyJoinRequest.update({
    where: { id },
    data: {
      status: "REJECTED",
      reviewedById: user.id,
    },
  });

  return NextResponse.json({
    success: true,
    message: "Join request has been rejected.",
  });
}
