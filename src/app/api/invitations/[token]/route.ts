import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
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
    include: {
      company: {
        select: {
          id: true,
          name: true,
          logo: true,
          slug: true,
          verification: true,
        },
      },
      invitedBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!invitation) {
    return NextResponse.json(
      { success: false, message: "Invitation not found or has been revoked." },
      { status: 404 }
    );
  }

  const isExpired = invitation.expiresAt < new Date();

  return NextResponse.json({
    success: true,
    data: {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: isExpired && invitation.status === "PENDING" ? "EXPIRED" : invitation.status,
      expiresAt: invitation.expiresAt,
      company: invitation.company,
      invitedBy: invitation.invitedBy,
    },
  });
}
