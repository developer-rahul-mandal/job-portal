import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/session";

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
// PATCH /api/me/education/[id]
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
      return errorResponse("Education ID is required.", 400);
    }

    const existing = await prisma.applicantEducation.findFirst({
      where: {
        id,
        userId: user.id,
      },
    });

    if (!existing) {
      return errorResponse("Education record not found.", 404);
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

    if (Object.keys(input).length === 0) {
      return errorResponse("No fields provided for update.", 400);
    }

    const data: Record<string, unknown> = {};

    // Institution
    if ("institution" in input) {
      if (
        typeof input.institution !== "string" ||
        !input.institution.trim() ||
        input.institution.trim().length > 200
      ) {
        return errorResponse("Invalid institution name.", 400);
      }

      data.institution = input.institution.trim();
    }

    // Degree
    if ("degree" in input) {
      if (
        typeof input.degree !== "string" ||
        !input.degree.trim() ||
        input.degree.trim().length > 150
      ) {
        return errorResponse("Invalid degree.", 400);
      }

      data.degree = input.degree.trim();
    }

    // Field of study
    if ("fieldOfStudy" in input) {
      if (
        typeof input.fieldOfStudy !== "string" ||
        !input.fieldOfStudy.trim() ||
        input.fieldOfStudy.trim().length > 150
      ) {
        return errorResponse("Invalid field of study.", 400);
      }

      data.fieldOfStudy = input.fieldOfStudy.trim();
    }

    // Start date
    if ("startDate" in input) {
      if (!isValidDate(input.startDate)) {
        return errorResponse("Invalid start date.", 400);
      }

      data.startDate = new Date(input.startDate);
    }

    // Currently studying
    if ("isCurrentlyStudying" in input) {
      if (typeof input.isCurrentlyStudying !== "boolean") {
        return errorResponse(
          "isCurrentlyStudying must be a boolean.",
          400,
        );
      }

      data.isCurrentlyStudying = input.isCurrentlyStudying;

      if (input.isCurrentlyStudying) {
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

    // Grade
    if ("grade" in input) {
      if (
        input.grade !== null &&
        (
          typeof input.grade !== "string" ||
          input.grade.trim().length > 50
        )
      ) {
        return errorResponse("Invalid grade.", 400);
      }

      data.grade =
        typeof input.grade === "string"
          ? input.grade.trim() || null
          : null;
    }

    // Description
    if ("description" in input) {
      if (
        input.description !== null &&
        (
          typeof input.description !== "string" ||
          input.description.length > 2000
        )
      ) {
        return errorResponse("Invalid description.", 400);
      }

      data.description =
        typeof input.description === "string"
          ? input.description.trim() || null
          : null;
    }

    const finalStartDate =
      (data.startDate as Date | undefined) ?? existing.startDate;

    const finalIsCurrentlyStudying =
      (data.isCurrentlyStudying as boolean | undefined) ??
      existing.isCurrentlyStudying;

    const finalEndDate =
      "endDate" in data
        ? (data.endDate as Date | null)
        : existing.endDate;

    if (
      !finalIsCurrentlyStudying &&
      !finalEndDate
    ) {
      return errorResponse(
        "End date is required when not currently studying.",
        400,
      );
    }

    if (
      finalEndDate &&
      finalEndDate < finalStartDate
    ) {
      return errorResponse(
        "End date cannot be earlier than start date.",
        400,
      );
    }

    if (finalIsCurrentlyStudying) {
      data.endDate = null;
    }

    const education = await prisma.applicantEducation.update({
      where: {
        id,
      },
      data,
    });

    return NextResponse.json({
      success: true,
      message: "Education record updated successfully.",
      data: education,
    });
  } catch (error) {
    console.error("PATCH_ME_EDUCATION_ERROR:", error);
    return errorResponse("An unexpected error occurred.", 500);
  }
}

// ======================================================
// DELETE /api/me/education/[id]
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
      return errorResponse("Education ID is required.", 400);
    }

    const existing = await prisma.applicantEducation.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return errorResponse("Education record not found.", 404);
    }

    await prisma.applicantEducation.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Education record deleted successfully.",
    });
  } catch (error) {
    console.error("DELETE_ME_EDUCATION_ERROR:", error);
    return errorResponse("An unexpected error occurred.", 500);
  }
}
