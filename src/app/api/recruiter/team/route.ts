import { NextRequest, NextResponse } from "next/server";
import { requireRecruiterApi } from "@/lib/auth/recruiter";
import { prisma } from "@/lib/prisma";
import { CompanyMembershipRole } from "@/generated/prisma/client";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

// ======================================================
// GET /api/recruiter/team
// Returns the list of team members for the company
// ======================================================
export async function GET(request: NextRequest) {
  const auth = await requireRecruiterApi(request, { requireCompany: true });
  if (!auth.success) return auth.response;

  const { company } = auth;

  const members = await prisma.companyRecruiter.findMany({
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
  });

  return NextResponse.json({
    success: true,
    data: members,
  });
}

// ======================================================
// POST /api/recruiter/team
// Adds / invites an existing registered user to the company recruiter team
// (Restricted to company Owner or Admin)
// ======================================================
export async function POST(request: NextRequest) {
  const auth = await requireRecruiterApi(request, {
    requireCompany: true,
    requireOwnerOrAdmin: true,
  });
  if (!auth.success) return auth.response;

  const { company, membership: callerMembership } = auth;

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

    // Find user by email
    const targetUser = await prisma.user.findUnique({
      where: { email: cleanEmail },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    });

    if (!targetUser) {
      return errorResponse(
        `No registered user found with email "${cleanEmail}". The user must first register an account on JobPortal before joining the team. (Note: External email invitation delivery is currently pending transactional template configuration).`,
        404
      );
    }

    if (!targetUser.isActive) {
      return errorResponse("This user account is currently deactivated.", 400);
    }

    // Check if already a member
    const existingMembership = await prisma.companyRecruiter.findUnique({
      where: {
        userId_companyId: {
          userId: targetUser.id,
          companyId: company.id,
        },
      },
    });

    if (existingMembership) {
      return errorResponse(`"${cleanEmail}" is already a member of this company team.`, 400);
    }

    // Atomically create membership and upgrade target user's role to RECRUITER if needed
    const newMembership = await prisma.$transaction(async (tx) => {
      if (targetUser.role === "APPLICANT") {
        await tx.user.update({
          where: { id: targetUser.id },
          data: { role: "RECRUITER" },
        });
      }

      return tx.companyRecruiter.create({
        data: {
          userId: targetUser.id,
          companyId: company.id,
          membershipRole: role,
          status: "ACTIVE",
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: `Successfully added ${targetUser.name || cleanEmail} to the recruiter team as ${role}.`,
        data: newMembership,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST_RECRUITER_TEAM_ERROR:", err);
    return errorResponse("Failed to add team member.", 500);
  }
}
