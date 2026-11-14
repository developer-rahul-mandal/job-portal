import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";

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

    const pageInput = searchParams.get("page");
    const limitInput = searchParams.get("limit");

    const page =
      pageInput === null ? 1 : Number(pageInput);

    const limit =
      limitInput === null ? 10 : Number(limitInput);

    if (
      !Number.isSafeInteger(page) ||
      page < 1
    ) {
      return errorResponse("Invalid page number", 400);
    }

    if (
      !Number.isSafeInteger(limit) ||
      limit < 1 ||
      limit > 50
    ) {
      return errorResponse(
        "Limit must be between 1 and 50",
        400
      );
    }

    const skip = (page - 1) * limit;

    if (!Number.isSafeInteger(skip)) {
      return errorResponse("Requested page is too large", 400);
    }

    const where = {
      userId: user.id,
    };

    const [total, savedJobs] = await prisma.$transaction([
      prisma.savedJob.count({
        where,
      }),

      prisma.savedJob.findMany({
        where,
        select: {
          id: true,
          createdAt: true,
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
              deadline: true,

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

    const now = new Date();

    const data = savedJobs.map((savedJob) => {
      const job = savedJob.job;

      let unavailableReason: string | null = null;

      if (job.status !== "PUBLISHED") {
        unavailableReason = "This job is no longer published";
      } else if (!job.publishedAt) {
        unavailableReason = "This job has not been published";
      } else if (job.deadline && job.deadline < now) {
        unavailableReason = "Application deadline has passed";
      }

      return {
        ...savedJob,
        isAvailable: unavailableReason === null,
        unavailableReason,
      };
    });

    const totalPages = Math.ceil(total / limit);

    return NextResponse.json({
      success: true,
      data,
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
    console.error("GET /api/me/saved-jobs error:", error);

    return errorResponse("Failed to fetch saved jobs", 500);
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

    if (
      Object.keys(body).some((key) => key !== "jobId")
    ) {
      return errorResponse("Unsupported field provided", 400);
    }

    if (
      typeof body.jobId !== "string" ||
      !body.jobId.trim()
    ) {
      return errorResponse("Valid jobId is required", 400);
    }

    const jobId = body.jobId.trim();
    const now = new Date();

    const job = await prisma.job.findUnique({
      where: {
        id: jobId,
      },
      select: {
        id: true,
        status: true,
        publishedAt: true,
        deadline: true,
      },
    });

    if (!job) {
      return errorResponse("Job not found", 404);
    }

    if (job.status !== "PUBLISHED" || !job.publishedAt) {
      return errorResponse("This job is not available for saving", 400);
    }

    if (job.deadline && job.deadline < now) {
      return errorResponse("Application deadline has passed", 400);
    }

    const savedJob = await prisma.savedJob.create({
      data: {
        userId: user.id,
        jobId: job.id,
      },
      select: {
        id: true,
        createdAt: true,
        jobId: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Job saved successfully",
        data: savedJob,
      },
      { status: 201 }
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return errorResponse("Job is already saved", 409);
    }

    console.error("POST /api/me/saved-jobs error:", error);

    return errorResponse("Failed to save job", 500);
  }
}
