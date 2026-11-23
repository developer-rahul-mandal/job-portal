import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Authentication required to accept an invitation." },
      { status: 401 }
    );
  }

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

  if (invitation.status !== "PENDING" || invitation.expiresAt < new Date()) {
    return NextResponse.json(
      {
        success: false,
        message:
          invitation.status === "ACCEPTED"
            ? "This invitation has already been accepted."
            : "This invitation has expired or is no longer valid.",
      },
      { status: 400 }
    );
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      // Mark invitation as accepted
      await tx.companyInvitation.update({
        where: { id: invitation.id },
        data: {
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
      });

      // Upsert recruiter membership without mutating user.role
      const membership = await tx.companyRecruiter.upsert({
        where: {
          userId_companyId: {
            userId: user.id,
            companyId: invitation.companyId,
          },
        },
        create: {
          userId: user.id,
          companyId: invitation.companyId,
          membershipRole: invitation.role,
          status: "ACTIVE",
          verificationStatus: "UNVERIFIED",
        },
        update: {
          membershipRole: invitation.role,
          status: "ACTIVE",
        },
      });

      return membership;
    });

    const response = NextResponse.json({
      success: true,
      message: `Successfully joined ${invitation.company.name} as ${invitation.role}.`,
      data: result,
    });

    // Set active company cookie
    response.cookies.set("active_company_id", invitation.companyId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (err) {
    console.error("INVITATION_ACCEPT_ERROR:", err);
    return NextResponse.json(
      { success: false, message: "Failed to accept team invitation." },
      { status: 500 }
    );
  }
}
