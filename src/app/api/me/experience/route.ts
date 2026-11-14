import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const runtime = "nodejs";

const EMPLOYMENT_TYPES = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
] as const;

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
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
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

    const experience = await prisma.applicantExperience.findMany({
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
      count: experience.length,
      data: experience,
    });
  } catch (error) {
    console.error("GET /api/me/experience error:", error);

    return errorResponse("Failed to fetch experience records", 500);
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
      "companyName",
      "jobTitle",
      "employmentType",
      "location",
      "description",
      "startDate",
      "endDate",
      "isCurrent",
    ];

    if (Object.keys(body).some((key) => !allowedFields.includes(key))) {
      return errorResponse("Unsupported field provided", 400);
    }

    const companyName =
      typeof body.companyName === "string"
        ? body.companyName.trim()
        : "";

    const jobTitle =
      typeof body.jobTitle === "string"
        ? body.jobTitle.trim()
        : "";

    if (!companyName || companyName.length > 200) {
      return errorResponse("Company name is required (max 200 characters)", 400);
    }

    if (!jobTitle || jobTitle.length > 150) {
      return errorResponse("Job title is required (max 150 characters)", 400);
    }

    let employmentType:
      | (typeof EMPLOYMENT_TYPES)[number]
      | null = null;

    if (body.employmentType !== undefined && body.employmentType !== null) {
      if (
        typeof body.employmentType !== "string" ||
        !EMPLOYMENT_TYPES.includes(
          body.employmentType as (typeof EMPLOYMENT_TYPES)[number]
        )
      ) {
        return errorResponse("Invalid employmentType", 400);
      }

      employmentType =
        body.employmentType as (typeof EMPLOYMENT_TYPES)[number];
    }

    const location = optionalString(body.location, 150);

    if (location === undefined) {
      return errorResponse("Invalid location (max 150 characters)", 400);
    }

    const description = optionalString(body.description, 5000);

    if (description === undefined) {
      return errorResponse("Invalid description (max 5000 characters)", 400);
    }

    const startDate = parseDate(body.startDate);

    if (!startDate) {
      return errorResponse("A valid startDate (YYYY-MM-DD) is required", 400);
    }

    if (isFutureDate(startDate)) {
      return errorResponse("startDate cannot be in the future", 400);
    }

    const isCurrent = body.isCurrent ?? false;

    if (typeof isCurrent !== "boolean") {
      return errorResponse("isCurrent must be a boolean", 400);
    }

    let endDate: Date | null = null;

    if (isCurrent) {
      if (body.endDate !== undefined && body.endDate !== null && body.endDate !== "") {
        return errorResponse("endDate must be empty for current employment", 400);
      }
    } else {
      endDate = parseDate(body.endDate);

      if (!endDate) {
        return errorResponse(
          "A valid endDate (YYYY-MM-DD) is required for past employment",
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

    const experience = await prisma.applicantExperience.create({
      data: {
        userId: user.id,
        companyName,
        jobTitle,
        employmentType,
        location,
        description,
        startDate,
        endDate,
        isCurrent,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Experience added successfully",
        data: experience,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/me/experience error:", error);

    return errorResponse("Failed to add experience", 500);
  }
}