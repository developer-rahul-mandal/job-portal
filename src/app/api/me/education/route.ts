import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const runtime = "nodejs";

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status }
  );
}

function isObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  // Accept YYYY-MM-DD only, avoiding ambiguous date formats.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value
  ) {
    return null;
  }

  return date;
}

function isFutureDate(date: Date): boolean {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  return date.getTime() > today.getTime();
}

function optionalString(
  value: unknown,
  maxLength: number
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  if (trimmed.length > maxLength) {
    return undefined;
  }

  return trimmed || null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    if (user.role !== "APPLICANT") {
      return errorResponse("Forbidden", 403);
    }

    const education = await prisma.applicantEducation.findMany({
      where: {
        userId: user.id,
      },
      orderBy: [
        {
          startDate: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      count: education.length,
      data: education,
    });
  } catch (error) {
    console.error("GET /api/me/education error:", error);

    return errorResponse("Failed to fetch education records", 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    if (user.role !== "APPLICANT") {
      return errorResponse("Forbidden", 403);
    }

    const body: unknown = await request.json();

    if (!isObject(body)) {
      return errorResponse("Invalid request body", 400);
    }

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

    if (Object.keys(body).some((key) => !allowedFields.includes(key))) {
      return errorResponse("Unsupported field provided", 400);
    }

    const institution =
      typeof body.institution === "string"
        ? body.institution.trim()
        : "";

    const degree =
      typeof body.degree === "string"
        ? body.degree.trim()
        : "";

    if (!institution || institution.length > 200) {
      return errorResponse("Institution is required (max 200 characters)", 400);
    }

    if (!degree || degree.length > 150) {
      return errorResponse("Degree is required (max 150 characters)", 400);
    }

    const fieldOfStudy = optionalString(body.fieldOfStudy, 150);

    if (fieldOfStudy === undefined) {
      return errorResponse("Invalid fieldOfStudy (max 150 characters)", 400);
    }

    if (typeof body.isCurrentlyStudying !== "boolean") {
      return errorResponse("isCurrentlyStudying must be a boolean", 400);
    }

    const startDate = parseDate(body.startDate);

    if (!startDate) {
      return errorResponse("A valid startDate (YYYY-MM-DD) is required", 400);
    }

    if (isFutureDate(startDate)) {
      return errorResponse("startDate cannot be in the future", 400);
    }

    let endDate: Date | null = null;

    if (body.isCurrentlyStudying) {
      if (body.endDate !== undefined && body.endDate !== null && body.endDate !== "") {
        return errorResponse(
          "endDate must be empty while currently studying",
          400
        );
      }
    } else {
      endDate = parseDate(body.endDate);

      if (!endDate) {
        return errorResponse(
          "A valid endDate (YYYY-MM-DD) is required when not currently studying",
          400
        );
      }

      if (isFutureDate(endDate)) {
        return errorResponse("endDate cannot be in the future", 400);
      }

      if (endDate < startDate) {
        return errorResponse("endDate cannot be before startDate", 400);
      }
    }

    const grade = optionalString(body.grade, 50);
    const description = optionalString(body.description, 2000);

    if (grade === undefined) {
      return errorResponse("Invalid grade (max 50 characters)", 400);
    }

    if (description === undefined) {
      return errorResponse("Invalid description (max 2000 characters)", 400);
    }

    const education = await prisma.applicantEducation.create({
      data: {
        userId: user.id,
        institution,
        degree,
        fieldOfStudy,
        startDate,
        endDate,
        isCurrentlyStudying: body.isCurrentlyStudying,
        grade,
        description,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Education added successfully",
        data: education,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/me/education error:", error);

    return errorResponse("Failed to add education", 500);
  }
}
