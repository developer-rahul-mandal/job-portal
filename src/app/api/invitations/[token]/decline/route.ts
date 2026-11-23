import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token || typeof token !== "string") {
    return NextResponse.json(
      { success: false, message: "Invalid invitation token." },
      { status: 400 }
    );
  }

  const invitation = await prisma.companyInvitation.findUnique({
    where: { token },
  });

  if (!invitation) {
    return NextResponse.json(
      { success: false, message: "Invitation not found." },
      { status: 404 }
    );
  }

  if (invitation.status !== "PENDING") {
    return NextResponse.json(
      { success: false, message: "Invitation is no longer pending." },
      { status: 400 }
    );
  }

  await prisma.companyInvitation.update({
    where: { id: invitation.id },
    data: { status: "DECLINED" },
  });

  return NextResponse.json({
    success: true,
    message: "Invitation declined successfully.",
  });
}
