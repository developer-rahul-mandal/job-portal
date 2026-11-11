import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/session";

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
    { status },
  );
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) {
    return false;
  }

  return !Number.isNaN(new Date(value).getTime());
}

// ======================================================
// GET /api/me/education
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

    const education = await prisma.applicantEducation.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        startDate: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Education records fetched successfully.",
      data: education,
    });
  } catch (error) {
    console.error("GET_ME_EDUCATION_ERROR:", error);
    return errorResponse("An unexpected error occurred.", 500);
  }
}

// ======================================================
// POST /api/me/education
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

    const allowedFields = [
      "institution",
      "degree",
      "fieldOfStudy",
      "startDate",
      "endDate",
      "isCurrentlyStudying",
      "grade",
      "description",
    ];

    const invalidFields = Object.keys(input).filter(
      (field) => !allowedFields.includes(field),
    );

    if (invalidFields.length > 0) {
      return errorResponse(
        `Unsupported fields: ${invalidFields.join(", ")}`,
        400,
      );
    }

    const institution =
      typeof input.institution === "string"
        ? input.institution.trim()
        : "";

    const degree =
      typeof input.degree === "string"
        ? input.degree.trim()
        : "";

    const fieldOfStudy =
      typeof input.fieldOfStudy === "string"
        ? input.fieldOfStudy.trim()
        : "";

    if (!institution || institution.length > 200) {
      return errorResponse("Invalid institution name.", 400);
    }

    if (!degree || degree.length > 150) {
      return errorResponse("Invalid degree.", 400);
    }

    if (!fieldOfStudy || fieldOfStudy.length > 150) {
      return errorResponse("Invalid field of study.", 400);
    }

    if (!isValidDate(input.startDate)) {
      return errorResponse("Invalid start date.", 400);
    }

    const isCurrentlyStudying = input.isCurrentlyStudying;

    if (typeof isCurrentlyStudying !== "boolean") {
      return errorResponse(
        "isCurrentlyStudying must be a boolean.",
        400,
      );
    }

    let endDate: Date | null = null;

    if (!isCurrentlyStudying && input.endDate !== null) {
      if (!isValidDate(input.endDate)) {
        return errorResponse("Invalid end date.", 400);
      }

      endDate = new Date(input.endDate);
    }

    const startDate = new Date(input.startDate);

    if (endDate && endDate < startDate) {
      return errorResponse(
        "End date cannot be earlier than start date.",
        400,
      );
    }

    let grade: string | null = null;

    if (input.grade !== undefined && input.grade !== null) {
      if (
        typeof input.grade !== "string" ||
        input.grade.trim().length > 50
      ) {
        return errorResponse("Invalid grade.", 400);
      }

      grade = input.grade.trim() || null;
    }

    let description: string | null = null;

    if (
      input.description !== undefined &&
      input.description !== null
    ) {
      if (
        typeof input.description !== "string" ||
        input.description.length > 2000
      ) {
        return errorResponse("Invalid description.", 400);
      }

      description = input.description.trim() || null;
    }

    const education = await prisma.applicantEducation.create({
      data: {
        userId: user.id,
        institution,
        degree,
        fieldOfStudy,
        startDate,
        endDate,
        isCurrentlyStudying,
        grade,
        description,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Education record created successfully.",
        data: education,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST_ME_EDUCATION_ERROR:", error);
    return errorResponse("An unexpected error occurred.", 500);
  }
}
