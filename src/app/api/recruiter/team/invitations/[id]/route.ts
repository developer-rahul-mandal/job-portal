import { NextRequest, NextResponse } from "next/server";
import { requireRecruiterApi } from "@/lib/auth/recruiter";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRecruiterApi(request, {
    requireCompany: true,
    requireOwnerOrAdmin: true,
  });
  if (!auth.success) return auth.response;

  const { company } = auth;
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { success: false, message: "Invitation ID is required." },
      { status: 400 }
    );
  }

  const invitation = await prisma.companyInvitation.findUnique({
    where: { id },
  });

  if (!invitation || invitation.companyId !== company.id) {
    return NextResponse.json(
      { success: false, message: "Invitation not found in this company." },
      { status: 404 }
    );
  }

  await prisma.companyInvitation.update({
    where: { id },
    data: { status: "REVOKED" },
  });

  return NextResponse.json({
    success: true,
    message: `Invitation for ${invitation.email} has been revoked.`,
  });
}
