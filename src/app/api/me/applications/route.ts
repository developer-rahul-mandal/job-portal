import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { ApplicationStatus } from "@/generated/prisma/client";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const runtime = "nodejs";

const APPLICATION_STATUSES = Object.values(ApplicationStatus);

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status },
  );
}

function parsePositiveInteger(
  value: string | null,
  fallback: number,
  max: number,
): number | null {
  if (value === null) return fallback;

  if (!/^\d+$/.test(value)) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > max) {
    return null;
  }

  return parsed;
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

    const searchParams = request.nextUrl.searchParams;

    const page = parsePositiveInteger(searchParams.get("page"), 1, 1_000_000);

    const limit = parsePositiveInteger(searchParams.get("limit"), 10, 50);

    if (page === null) {
      return errorResponse("Invalid page. Must be a positive integer.", 400);
    }

    if (limit === null) {
      return errorResponse("Invalid limit. Use a value between 1 and 50.", 400);
    }

    const statusInput = searchParams.get("status");

    if (
      statusInput !== null &&
      !APPLICATION_STATUSES.includes(statusInput as ApplicationStatus)
    ) {
      return errorResponse("Invalid application status", 400);
    }

    const status = statusInput as ApplicationStatus | undefined;

    const skip = (page - 1) * limit;

    if (!Number.isSafeInteger(skip)) {
      return errorResponse("Requested page is too large", 400);
    }

    const where = {
      userId: user.id,
      ...(status ? { status } : {}),
    };

    const [total, applications] = await prisma.$transaction([
      prisma.application.count({
        where,
      }),

      prisma.application.findMany({
        where,
        select: {
          id: true,
          status: true,
          applicantName: true,
          applicantEmail: true,
          coverLetter: true,
          createdAt: true,
          updatedAt: true,

          resume: {
            select: {
              id: true,
              title: true,
              fileName: true,
              mimeType: true,
              fileSize: true,
            },
          },

          job: {
            select: {
              id: true,
              slug: true,
              title: true,
              shortDescription: true,
              location: true,
              employmentType: true,
              experienceLevel: true,
              salaryMin: true,
              salaryMax: true,
              salaryCurrency: true,
              salaryPeriod: true,
              status: true,
              publishedAt: true,

              company: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  logo: true,
                  location: true,
                },
              },

              category: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                },
              },
            },
          },
        },

        orderBy: [
          {
            createdAt: "desc",
          },
          {
            id: "desc",
          },
        ],

        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data: applications,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1 && total > 0,
      },
    });
  } catch (error) {
    console.error("GET /api/me/applications error:", error);

    return errorResponse("Failed to fetch applications", 500);
  }
}
