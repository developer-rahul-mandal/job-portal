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

function normalizeSkillName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

// ======================================================
// POST /api/me/skill-suggestions
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

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON request body.", 400);
    }

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return errorResponse("Invalid request body.", 400);
    }

    const input = body as Record<string, unknown>;

    if (
      Object.keys(input).some((field) => field !== "name")
    ) {
      return errorResponse("Unsupported request fields.", 400);
    }

    if (
      typeof input.name !== "string" ||
      !input.name.trim()
    ) {
      return errorResponse("Skill name is required.", 400);
    }

    const name = input.name.trim();

    if (name.length < 2 || name.length > 100) {
      return errorResponse(
        "Skill name must contain between 2 and 100 characters.",
        400,
      );
    }

    const normalized = normalizeSkillName(name);

    // Check whether the skill already exists.
    const existingSkill = await prisma.skill.findFirst({
      where: {
        name: {
          equals: name,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (existingSkill) {
      return NextResponse.json(
        {
          success: false,
          message: "This skill already exists.",
          data: existingSkill,
        },
        { status: 409 },
      );
    }

    // Check whether this skill was suggested before.
    const existingSuggestion =
      await prisma.skillSuggestion.findUnique({
        where: {
          normalized,
        },
      });

    if (existingSuggestion) {
      if (existingSuggestion.status === "PENDING") {
        return errorResponse(
          "This skill has already been suggested and is awaiting review.",
          409,
        );
      }

      if (existingSuggestion.status === "APPROVED") {
        return errorResponse(
          "This skill suggestion has already been approved.",
          409,
        );
      }

      // Allow rejected suggestions to be submitted again.
      const resubmitted = await prisma.skillSuggestion.update({
        where: {
          id: existingSuggestion.id,
        },
        data: {
          name,
          suggestedBy: user.id,
          status: "PENDING",
        },
        select: {
          id: true,
          name: true,
          status: true,
          createdAt: true,
        },
      });

      return NextResponse.json(
        {
          success: true,
          message: "Skill suggestion resubmitted successfully.",
          data: resubmitted,
        },
        { status: 200 },
      );
    }

    // Create a new suggestion.
    const suggestion = await prisma.skillSuggestion.create({
      data: {
        name,
        normalized,
        suggestedBy: user.id,
      },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Skill suggestion submitted successfully.",
        data: suggestion,
      },
      { status: 201 },
    );
  } catch (error) {
    // Handle duplicate submissions caused by concurrent requests.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return errorResponse(
        "This skill has already been suggested.",
        409,
      );
    }

    console.error("POST_SKILL_SUGGESTION_ERROR:", error);

    return errorResponse("An unexpected error occurred.", 500);
  }
}

// ======================================================
// GET /api/me/skill-suggestions
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

    const suggestions = await prisma.skillSuggestion.findMany({
      where: {
        suggestedBy: user.id,
      },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Skill suggestions fetched successfully.",
      data: suggestions,
    });
  } catch (error) {
    console.error("GET_ME_SKILL_SUGGESTIONS_ERROR:", error);

    return errorResponse("An unexpected error occurred.", 500);
  }
}