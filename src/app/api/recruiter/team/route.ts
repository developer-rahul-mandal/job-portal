import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireRecruiterApi } from "@/lib/auth/recruiter";
import { prisma } from "@/lib/prisma";
import { CompanyMembershipRole } from "@/generated/prisma/client";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

// ======================================================
// GET /api/recruiter/team
// Returns the list of team members, pending invitations, and join requests
// ======================================================
export async function GET(request: NextRequest) {
  const auth = await requireRecruiterApi(request, { requireCompany: true });
  if (!auth.success) return auth.response;

  const { company } = auth;

  const [members, invitations, joinRequests] = await Promise.all([
    prisma.companyRecruiter.findMany({
      where: { companyId: company.id },
      orderBy: [{ membershipRole: "asc" }, { createdAt: "asc" }],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            emailVerifiedAt: true,
          },
        },
      },
    }),
    prisma.companyInvitation.findMany({
      where: {
        companyId: company.id,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
      include: {
        invitedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
    prisma.companyJoinRequest.findMany({
      where: {
        companyId: company.id,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      members,
      invitations,
      joinRequests,
    },
  });
}

// ======================================================
// POST /api/recruiter/team
// Creates a secure tokenized invitation for a team member
// Does NOT mutate global User.role
// ======================================================
export async function POST(request: NextRequest) {
  const auth = await requireRecruiterApi(request, {
    requireCompany: true,
    requireOwnerOrAdmin: true,
  });
  if (!auth.success) return auth.response;

  const { user, company, membership: callerMembership } = auth;

  try {
    const body = await request.json();
    const { email, role = "RECRUITER" } = body;

    if (!email || typeof email !== "string" || !email.trim()) {
      return errorResponse("User email address is required.", 400);
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      return errorResponse("Invalid email address format.", 400);
    }

    // Role validation
    const validRoles: CompanyMembershipRole[] = ["ADMIN", "RECRUITER"];
    if (!validRoles.includes(role)) {
      return errorResponse("Invalid role. Only ADMIN or RECRUITER can be assigned.", 400);
    }

    // Only OWNER can assign ADMIN role
    if (role === "ADMIN" && callerMembership.membershipRole !== "OWNER") {
      return errorResponse("Only the company Owner can appoint team Administrators.", 403);
    }

    // Check if target user is already an active member of this company
    const existingActiveMember = await prisma.companyRecruiter.findFirst({
      where: {
        companyId: company.id,
        user: { email: cleanEmail },
        status: "ACTIVE",
      },
    });

    if (existingActiveMember) {
      return errorResponse(`"${cleanEmail}" is already an active member of this company team.`, 400);
    }

    // Check if a pending unexpired invitation already exists for this email
    const existingPendingInvitation = await prisma.companyInvitation.findFirst({
      where: {
        companyId: company.id,
        email: cleanEmail,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
    });

    if (existingPendingInvitation) {
      return errorResponse(
        `An active invitation has already been sent to "${cleanEmail}". Token: ${existingPendingInvitation.token}`,
        400
      );
    }

    // Generate cryptographically secure token and 7-day expiration
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const invitation = await prisma.companyInvitation.create({
      data: {
        companyId: company.id,
        email: cleanEmail,
        role,
        token,
        status: "PENDING",
        invitedById: user.id,
        expiresAt,
      },
      include: {
        company: {
          select: { name: true },
        },
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Invitation generated for ${cleanEmail} as ${role}.`,
        data: {
          invitationId: invitation.id,
          email: invitation.email,
          role: invitation.role,
          token: invitation.token,
          inviteUrl: `/invite/${invitation.token}`,
          expiresAt: invitation.expiresAt,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST_RECRUITER_TEAM_ERROR:", err);
    return errorResponse("Failed to create team invitation.", 500);
  }
}
