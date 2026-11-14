import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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
      return errorResponse("Education ID is required", 400);
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

    if (Object.keys(body).length === 0) {
      return errorResponse("No fields provided for update", 400);
    }

    const existing = await prisma.applicantEducation.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existing) {
      return errorResponse("Education record not found", 404);
    }

    const data: {
      institution?: string;
      degree?: string;
      fieldOfStudy?: string | null;
      startDate?: Date;
      endDate?: Date | null;
      isCurrentlyStudying?: boolean;
      grade?: string | null;
      description?: string | null;
    } = {};

    if ("institution" in body) {
      if (
        typeof body.institution !== "string" ||
        !body.institution.trim() ||
        body.institution.trim().length > 200
      ) {
        return errorResponse("Invalid institution (max 200 characters)", 400);
      }

      data.institution = body.institution.trim();
    }

    if ("degree" in body) {
      if (
        typeof body.degree !== "string" ||
        !body.degree.trim() ||
        body.degree.trim().length > 150
      ) {
        return errorResponse("Invalid degree (max 150 characters)", 400);
      }

      data.degree = body.degree.trim();
    }

    if ("fieldOfStudy" in body) {
      const value = optionalString(body.fieldOfStudy, 150);

      if (value === undefined) {
        return errorResponse("Invalid fieldOfStudy (max 150 characters)", 400);
      }

      data.fieldOfStudy = value;
    }

    if ("grade" in body) {
      const value = optionalString(body.grade, 50);

      if (value === undefined) {
        return errorResponse("Invalid grade (max 50 characters)", 400);
      }

      data.grade = value;
    }

    if ("description" in body) {
      const value = optionalString(body.description, 2000);

      if (value === undefined) {
        return errorResponse("Invalid description (max 2000 characters)", 400);
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

    if ("isCurrentlyStudying" in body) {
      if (typeof body.isCurrentlyStudying !== "boolean") {
        return errorResponse("isCurrentlyStudying must be a boolean", 400);
      }

      data.isCurrentlyStudying = body.isCurrentlyStudying;
    }

    const finalIsCurrentlyStudying =
      data.isCurrentlyStudying ?? existing.isCurrentlyStudying;

    const finalStartDate = data.startDate ?? existing.startDate;

    let finalEndDate: Date | null =
      "endDate" in body
        ? null
        : existing.endDate;

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

    if (finalIsCurrentlyStudying) {
      if (finalEndDate !== null) {
        return errorResponse(
          "endDate must be empty while currently studying",
          400
        );
      }

      data.endDate = null;
    } else {
      if (!finalEndDate) {
        return errorResponse(
          "endDate is required when not currently studying",
          400
        );
      }

      if (finalEndDate < finalStartDate) {
        return errorResponse("endDate cannot be before startDate", 400);
      }

      data.endDate = finalEndDate;
    }

    if (isFutureDate(finalStartDate)) {
      return errorResponse("startDate cannot be in the future", 400);
    }

    const result = await prisma.applicantEducation.updateMany({
      where: {
        id,
        userId: user.id,
      },
      data,
    });

    if (result.count === 0) {
      return errorResponse("Education record not found", 404);
    }

    const updatedEducation = await prisma.applicantEducation.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Education updated successfully",
      data: updatedEducation,
    });
  } catch (error) {
    console.error("PATCH /api/me/education/[id] error:", error);

    return errorResponse("Failed to update education", 500);
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
      return errorResponse("Education ID is required", 400);
    }

    const result = await prisma.applicantEducation.deleteMany({
      where: {
        id,
        userId: user.id,
      },
    });

    if (result.count === 0) {
      return errorResponse("Education record not found", 404);
    }

    return NextResponse.json({
      success: true,
      message: "Education deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/me/education/[id] error:", error);

    return errorResponse("Failed to delete education", 500);
  }
}
