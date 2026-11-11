import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/session";

const employmentTypes = [
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
    { status },
  );
}

function isValidDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.trim().length > 0 &&
    !Number.isNaN(new Date(value).getTime())
  );
}

// ======================================================
// GET /api/me/experience
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

    const experience = await prisma.applicantExperience.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        startDate: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Experience records fetched successfully.",
      data: experience,
    });
  } catch (error) {
    console.error("GET_ME_EXPERIENCE_ERROR:", error);

    return errorResponse("An unexpected error occurred.", 500);
  }
}

// ======================================================
// POST /api/me/experience
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
      "companyName",
      "jobTitle",
      "employmentType",
      "location",
      "description",
      "startDate",
      "endDate",
      "isCurrent",
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

    // Company name
    if (
      typeof input.companyName !== "string" ||
      !input.companyName.trim() ||
      input.companyName.trim().length > 200
    ) {
      return errorResponse("Invalid company name.", 400);
    }

    // Job title
    if (
      typeof input.jobTitle !== "string" ||
      !input.jobTitle.trim() ||
      input.jobTitle.trim().length > 150
    ) {
      return errorResponse("Invalid job title.", 400);
    }

    // Employment type
    let employmentType:
      | (typeof employmentTypes)[number]
      | null = null;

    if (
      input.employmentType !== undefined &&
      input.employmentType !== null
    ) {
      if (
        typeof input.employmentType !== "string" ||
        !employmentTypes.includes(
          input.employmentType as (typeof employmentTypes)[number],
        )
      ) {
        return errorResponse("Invalid employment type.", 400);
      }

      employmentType =
        input.employmentType as (typeof employmentTypes)[number];
    }

    // Location
    let location: string | null = null;

    if (input.location !== undefined && input.location !== null) {
      if (
        typeof input.location !== "string" ||
        input.location.trim().length > 150
      ) {
        return errorResponse("Invalid location.", 400);
      }

      location = input.location.trim() || null;
    }

    // Description
    let description: string | null = null;

    if (
      input.description !== undefined &&
      input.description !== null
    ) {
      if (
        typeof input.description !== "string" ||
        input.description.length > 5000
      ) {
        return errorResponse("Invalid description.", 400);
      }

      description = input.description.trim() || null;
    }

    // Start date
    if (!isValidDate(input.startDate)) {
      return errorResponse("Invalid start date.", 400);
    }

    const startDate = new Date(input.startDate);

    // Current employment status
    const isCurrent = input.isCurrent ?? false;

    if (typeof isCurrent !== "boolean") {
      return errorResponse("isCurrent must be a boolean.", 400);
    }

    // End date
    let endDate: Date | null = null;

    if (!isCurrent) {
      if (!isValidDate(input.endDate)) {
        return errorResponse(
          "A valid end date is required when employment is not current.",
          400,
        );
      }

      endDate = new Date(input.endDate);

      if (endDate < startDate) {
        return errorResponse(
          "End date cannot be earlier than start date.",
          400,
        );
      }
    }

    // Create experience
    const experience = await prisma.applicantExperience.create({
      data: {
        userId: user.id,
        companyName: input.companyName.trim(),
        jobTitle: input.jobTitle.trim(),
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
        message: "Experience record created successfully.",
        data: experience,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST_ME_EXPERIENCE_ERROR:", error);

    return errorResponse("An unexpected error occurred.", 500);
  }
}