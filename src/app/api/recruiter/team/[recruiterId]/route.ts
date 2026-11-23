import { NextRequest, NextResponse } from "next/server";
import { requireRecruiterApi } from "@/lib/auth/recruiter";
import { prisma } from "@/lib/prisma";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

// ======================================================
// DELETE /api/recruiter/team/[recruiterId]
// Removes a recruiter from the company team
// ======================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ recruiterId: string }> }
) {
  const auth = await requireRecruiterApi(request, {
    requireCompany: true,
    requireOwnerOrAdmin: true,
  });
  if (!auth.success) return auth.response;

  const { user, company, membership: callerMembership } = auth;
  const { recruiterId } = await params;

  if (!recruiterId) return errorResponse("Recruiter membership ID is required.", 400);

  const targetMembership = await prisma.companyRecruiter.findUnique({
    where: { id: recruiterId },
    include: { user: { select: { email: true, name: true } } },
  });

  if (!targetMembership) {
    return errorResponse("Team membership record not found.", 404);
  }

  // Cross-company isolation
  if (targetMembership.companyId !== company.id) {
    return errorResponse("Unauthorized: This membership belongs to another company.", 403);
  }

  // Cannot remove owner
  if (targetMembership.membershipRole === "OWNER") {
    return errorResponse("The company Owner cannot be removed from the team.", 400);
  }

  // Cannot remove oneself
  if (targetMembership.userId === user.id) {
    return errorResponse("You cannot remove your own team membership.", 400);
  }

  // Admin cannot remove another Admin or Owner (only Owner can)
  if (
    callerMembership.membershipRole === "ADMIN" &&
    targetMembership.membershipRole === "ADMIN"
  ) {
    return errorResponse("Only the company Owner can remove other Administrators.", 403);
  }

    await prisma.companyRecruiter.delete({
      where: { id: recruiterId },
    });

  return NextResponse.json({
    success: true,
    message: `Team member ${targetMembership.user.name || targetMembership.user.email} removed from the company.`,
  });
}
