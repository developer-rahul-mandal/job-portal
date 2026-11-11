import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/session";

type RouteContext = {
  params: Promise<{ skillId: string }>;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status },
  );
}

// ======================================================
// DELETE /api/me/skills/[skillId]
// ======================================================

export async function DELETE(
  request: NextRequest,
  { params }: RouteContext,
) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return errorResponse("Authentication required.", 401);
    }

    if (user.role !== "APPLICANT") {
      return errorResponse("Applicant access required.", 403);
    }

    const { skillId } = await params;

    if (!skillId) {
      return errorResponse("Skill ID is required.", 400);
    }

    const existing = await prisma.applicantSkill.findUnique({
      where: {
        userId_skillId: {
          userId: user.id,
          skillId,
        },
      },
    });

    if (!existing) {
      return errorResponse(
        "This skill is not associated with your profile.",
        404,
      );
    }

    await prisma.applicantSkill.delete({
      where: {
        userId_skillId: {
          userId: user.id,
          skillId,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Skill removed successfully.",
    });
  } catch (error) {
    console.error("DELETE_ME_SKILL_ERROR:", error);

    return errorResponse("An unexpected error occurred.", 500);
  }
}
