import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/session";

const employmentTypes = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
] as const;

type RouteContext = {
  params: Promise<{ id: string }>;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    { success: false, message },
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
// PATCH /api/me/experience/[id]
// ======================================================

export async function PATCH(
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

    const { id } = await params;

    if (!id) {
      return errorResponse("Experience ID is required.", 400);
    }

    const existing = await prisma.applicantExperience.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existing) {
      return errorResponse("Experience record not found.", 404);
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

    if (Object.keys(input).length === 0) {
      return errorResponse("No fields provided for update.", 400);
    }

    const data: Record<string, unknown> = {};

    // Company name
    if ("companyName" in input) {
      if (
        typeof input.companyName !== "string" ||
        !input.companyName.trim() ||
        input.companyName.trim().length > 200
      ) {
        return errorResponse("Invalid company name.", 400);
      }

      data.companyName = input.companyName.trim();
    }

    // Job title
    if ("jobTitle" in input) {
      if (
        typeof input.jobTitle !== "string" ||
        !input.jobTitle.trim() ||
        input.jobTitle.trim().length > 150
      ) {
        return errorResponse("Invalid job title.", 400);
      }

      data.jobTitle = input.jobTitle.trim();
    }

    // Employment type
    if ("employmentType" in input) {
      if (input.employmentType === null) {
        data.employmentType = null;
      } else if (
        typeof input.employmentType !== "string" ||
        !employmentTypes.includes(
          input.employmentType as (typeof employmentTypes)[number],
        )
      ) {
        return errorResponse("Invalid employment type.", 400);
      } else {
        data.employmentType =
          input.employmentType as (typeof employmentTypes)[number];
      }
    }

    // Location
    if ("location" in input) {
      if (
        input.location !== null &&
        (
          typeof input.location !== "string" ||
          input.location.trim().length > 150
        )
      ) {
        return errorResponse("Invalid location.", 400);
      }

      data.location =
        typeof input.location === "string"
          ? input.location.trim() || null
          : null;
    }

    // Description
    if ("description" in input) {
      if (
        input.description !== null &&
        (
          typeof input.description !== "string" ||
          input.description.length > 5000
        )
      ) {
        return errorResponse("Invalid description.", 400);
      }

      data.description =
        typeof input.description === "string"
          ? input.description.trim() || null
          : null;
    }

    // Start date
    if ("startDate" in input) {
      if (!isValidDate(input.startDate)) {
        return errorResponse("Invalid start date.", 400);
      }

      data.startDate = new Date(input.startDate);
    }

    // Current employment
    if ("isCurrent" in input) {
      if (typeof input.isCurrent !== "boolean") {
        return errorResponse("isCurrent must be a boolean.", 400);
      }

      data.isCurrent = input.isCurrent;

      if (input.isCurrent) {
        data.endDate = null;
      }
    }

    // End date
    if ("endDate" in input) {
      if (input.endDate === null) {
        data.endDate = null;
      } else {
        if (!isValidDate(input.endDate)) {
          return errorResponse("Invalid end date.", 400);
        }

        data.endDate = new Date(input.endDate);
      }
    }

    // Validate final date combination
    const finalStartDate =
      (data.startDate as Date | undefined) ?? existing.startDate;

    const finalIsCurrent =
      (data.isCurrent as boolean | undefined) ?? existing.isCurrent;

    const finalEndDate =
      "endDate" in data
        ? (data.endDate as Date | null)
        : existing.endDate;

    if (!finalIsCurrent && !finalEndDate) {
      return errorResponse(
        "End date is required when employment is not current.",
        400,
      );
    }

    if (finalEndDate && finalEndDate < finalStartDate) {
      return errorResponse(
        "End date cannot be earlier than start date.",
        400,
      );
    }

    if (finalIsCurrent) {
      data.endDate = null;
    }

    const experience = await prisma.applicantExperience.update({
      where: {
        id,
      },
      data: data as Parameters<
        typeof prisma.applicantExperience.update
      >[0]["data"],
    });

    return NextResponse.json({
      success: true,
      message: "Experience record updated successfully.",
      data: experience,
    });
  } catch (error) {
    console.error("PATCH_ME_EXPERIENCE_ERROR:", error);

    return errorResponse("An unexpected error occurred.", 500);
  }
}

// ======================================================
// DELETE /api/me/experience/[id]
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

    const { id } = await params;

    if (!id) {
      return errorResponse("Experience ID is required.", 400);
    }

    const existing = await prisma.applicantExperience.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return errorResponse("Experience record not found.", 404);
    }

    await prisma.applicantExperience.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Experience record deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE_ME_EXPERIENCE_ERROR:", error);

    return errorResponse("An unexpected error occurred.", 500);
  }
}