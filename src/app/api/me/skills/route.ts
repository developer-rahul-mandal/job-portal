import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/session";

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
// POST /api/me/skills
// ======================================================

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return errorResponse("Authentication required.", 401);
    }

    if (user.role !== "APPLICANT") {
      return errorResponse("Applicant access required.", 403);
    }

    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return errorResponse("Invalid request body.", 400);
    }

    const input = body as Record<string, unknown>;

    if (!Array.isArray(input.skillIds)) {
      return errorResponse("skillIds must be an array.", 400);
    }

    if (input.skillIds.length === 0) {
      return errorResponse("Select at least one skill.", 400);
    }

    if (input.skillIds.length > 50) {
      return errorResponse("Maximum 50 skills can be added at once.", 400);
    }

    const skillIds = input.skillIds;

    if (
      !skillIds.every(
        (id) => typeof id === "string" && id.trim().length > 0,
      )
    ) {
      return errorResponse("Invalid skill IDs.", 400);
    }

    const uniqueSkillIds = [...new Set(skillIds as string[])];

    const skills = await prisma.skill.findMany({
      where: {
        id: {
          in: uniqueSkillIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (skills.length !== uniqueSkillIds.length) {
      return errorResponse(
        "One or more selected skills do not exist.",
        400,
      );
    }

    const result = await prisma.applicantSkill.createMany({
      data: uniqueSkillIds.map((skillId) => ({
        userId: user.id,
        skillId,
      })),
      skipDuplicates: true,
    });

    const applicantSkills = await prisma.applicantSkill.findMany({
      where: {
        userId: user.id,
      },
      select: {
        skillId: true,
        createdAt: true,
        skill: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Skills added successfully.",
        data: {
          addedCount: result.count,
          skippedCount: uniqueSkillIds.length - result.count,
          skills: applicantSkills,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("POST_ME_SKILLS_ERROR:", error);

    return errorResponse("An unexpected error occurred.", 500);
  }
}

// ======================================================
// GET /api/me/skills
// ======================================================

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return errorResponse("Authentication required.", 401);
    }

    if (user.role !== "APPLICANT") {
      return errorResponse("Applicant access required.", 403);
    }

    const skills = await prisma.applicantSkill.findMany({
      where: {
        userId: user.id,
      },
      select: {
        skillId: true,
        createdAt: true,
        skill: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Applicant skills fetched successfully.",
      data: skills,
    });
  } catch (error) {
    console.error("GET_ME_SKILLS_ERROR:", error);

    return errorResponse("An unexpected error occurred.", 500);
  }
}
