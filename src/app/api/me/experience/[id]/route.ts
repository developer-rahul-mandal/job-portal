
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    if (user.role !== "APPLICANT") {
      return errorResponse("Forbidden", 403);
    }

    const { id } = await context.params;

    if (!id) {
      return errorResponse("Experience ID is required", 400);
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

    if (Object.keys(body).length === 0) {
      return errorResponse("No fields provided for update", 400);
    }

    const existing = await prisma.applicantExperience.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existing) {
      return errorResponse("Experience record not found", 404);
    }

    const data: {
      companyName?: string;
      jobTitle?: string;
      employmentType?: (typeof EMPLOYMENT_TYPES)[number] | null;
      location?: string | null;
      description?: string | null;
      startDate?: Date;
      endDate?: Date | null;
      isCurrent?: boolean;
    } = {};

    if ("companyName" in body) {
      if (
        typeof body.companyName !== "string" ||
        !body.companyName.trim() ||
        body.companyName.trim().length > 200
      ) {
        return errorResponse("Invalid companyName (max 200 characters)", 400);
      }

      data.companyName = body.companyName.trim();
    }

    if ("jobTitle" in body) {
      if (
        typeof body.jobTitle !== "string" ||
        !body.jobTitle.trim() ||
        body.jobTitle.trim().length > 150
      ) {
        return errorResponse("Invalid jobTitle (max 150 characters)", 400);
      }

      data.jobTitle = body.jobTitle.trim();
    }

    if ("employmentType" in body) {
      if (body.employmentType === null) {
        data.employmentType = null;
      } else if (
        typeof body.employmentType === "string" &&
        EMPLOYMENT_TYPES.includes(
          body.employmentType as (typeof EMPLOYMENT_TYPES)[number]
        )
      ) {
        data.employmentType =
          body.employmentType as (typeof EMPLOYMENT_TYPES)[number];
      } else {
        return errorResponse("Invalid employmentType", 400);
      }
    }

    if ("location" in body) {
      const value = optionalString(body.location, 150);

      if (value === undefined) {
        return errorResponse("Invalid location (max 150 characters)", 400);
      }

      data.location = value;
    }

    if ("description" in body) {
      const value = optionalString(body.description, 5000);

      if (value === undefined) {
        return errorResponse("Invalid description (max 5000 characters)", 400);
      }

      data.description = value;
    }

    if ("startDate" in body) {
      const date = parseDate(body.startDate);

      if (!date) {
        return errorResponse("Invalid startDate (use YYYY-MM-DD)", 400);
      }

      if (isFutureDate(date)) {
        return errorResponse("startDate cannot be in the future", 400);
      }

      data.startDate = date;
    }

    if ("isCurrent" in body) {
      if (typeof body.isCurrent !== "boolean") {
        return errorResponse("isCurrent must be a boolean", 400);
      }

      data.isCurrent = body.isCurrent;
    }

    const finalIsCurrent = data.isCurrent ?? existing.isCurrent;
    const finalStartDate = data.startDate ?? existing.startDate;

    let finalEndDate: Date | null =
      "endDate" in body ? null : existing.endDate;

    if ("endDate" in body) {
      if (body.endDate === null || body.endDate === "") {
        finalEndDate = null;
      } else {
        const date = parseDate(body.endDate);

        if (!date) {
          return errorResponse("Invalid endDate (use YYYY-MM-DD)", 400);
        }

        if (isFutureDate(date)) {
          return errorResponse("endDate cannot be in the future", 400);
        }

        finalEndDate = date;
      }
    }

    if (isFutureDate(finalStartDate)) {
      return errorResponse("startDate cannot be in the future", 400);
    }

    if (finalIsCurrent) {
      if (finalEndDate !== null) {
        return errorResponse(
          "endDate must be empty for current employment",
          400
        );
      }

      data.endDate = null;
    } else {
      if (!finalEndDate) {
        return errorResponse(
          "endDate is required for past employment",
          400
        );
      }

      if (finalEndDate < finalStartDate) {
        return errorResponse("endDate cannot be before startDate", 400);
      }

      data.endDate = finalEndDate;
    }

    const result = await prisma.applicantExperience.updateMany({
      where: {
        id,
        userId: user.id,
      },
      data,
    });

    if (result.count === 0) {
      return errorResponse("Experience record not found", 404);
    }

    const updatedExperience = await prisma.applicantExperience.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Experience updated successfully",
      data: updatedExperience,
    });
  } catch (error) {
    console.error("PATCH /api/me/experience/[id] error:", error);

    return errorResponse("Failed to update experience", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    if (user.role !== "APPLICANT") {
      return errorResponse("Forbidden", 403);
    }

    const { id } = await context.params;

    if (!id) {
      return errorResponse("Experience ID is required", 400);
    }

    const result = await prisma.applicantExperience.deleteMany({
      where: {
        id,
        userId: user.id,
      },
    });

    if (result.count === 0) {
      return errorResponse("Experience record not found", 404);
    }

    return NextResponse.json({
      success: true,
      message: "Experience deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/me/experience/[id] error:", error);

    return errorResponse("Failed to delete experience", 500);
  }
}
