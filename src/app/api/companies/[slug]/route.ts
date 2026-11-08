
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

const allowedOrigins = (
  process.env.CORS_ALLOWED_ORIGINS ??
  "http://localhost:3000,http://127.0.0.1:3000"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function getCorsHeaders(origin: string | null) {
  const headers = new Headers();

  if (origin && allowedOrigins.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Vary", "Origin");
  }

  headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  return headers;
}

function jsonResponse(
  data: unknown,
  status: number,
  origin: string | null
) {
  return NextResponse.json(data, {
    status,
    headers: getCorsHeaders(origin),
  });
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");

  if (origin && !allowedOrigins.includes(origin)) {
    return new NextResponse(null, { status: 403 });
  }

  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  const origin = request.headers.get("origin");

  if (origin && !allowedOrigins.includes(origin)) {
    return jsonResponse(
      {
        success: false,
        message: "Origin not allowed",
      },
      403,
      origin
    );
  }

  try {
    const { slug } = await params;
    const searchParams = request.nextUrl.searchParams;

    const pageParam = Number(searchParams.get("page") ?? 1);
    const limitParam = Number(searchParams.get("limit") ?? 10);

    const page =
      Number.isInteger(pageParam) && pageParam > 0
        ? pageParam
        : 1;

    const limit =
      Number.isInteger(limitParam) && limitParam > 0
        ? Math.min(limitParam, 50)
        : 10;

    const skip = (page - 1) * limit;
    const now = new Date();

    const company = await prisma.company.findUnique({
      where: {
        slug,
      },

      select: {
        id: true,
        name: true,
        slug: true,
        overview: true,
        industry: true,
        logo: true,
        website: true,
        officialEmail: true,
        location: true,
        verification: true,
        rating: true,
        createdAt: true,
      },
    });

    if (!company) {
      return jsonResponse(
        {
          success: false,
          message: "Company not found",
        },
        404,
        origin
      );
    }

    const jobsWhere = {
      companyId: company.id,
      status: "PUBLISHED" as const,
      OR: [
        {
          deadline: null,
        },
        {
          deadline: {
            gte: now,
          },
        },
      ],
    };

    const [jobs, totalJobs] = await Promise.all([
      prisma.job.findMany({
        where: jobsWhere,

        orderBy: [
          {
            publishedAt: "desc",
          },
          {
            createdAt: "desc",
          },
        ],

        skip,
        take: limit,

        select: {
          id: true,
          slug: true,
          title: true,
          shortDescription: true,
          role: true,
          detailedTitle: true,
          location: true,
          employmentType: true,
          experienceLevel: true,
          experienceYears: true,
          salaryMin: true,
          salaryMax: true,
          salaryCurrency: true,
          salaryPeriod: true,
          logo: true,
          rating: true,
          publishedAt: true,
          deadline: true,

          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      }),

      prisma.job.count({
        where: jobsWhere,
      }),
    ]);

    const totalPages = Math.ceil(totalJobs / limit);

    return jsonResponse(
      {
        success: true,

        data: {
          company: {
            ...company,
            rating: company.rating?.toString() ?? null,
          },

          jobs: jobs.map((job) => ({
            ...job,
            experienceYears:
              job.experienceYears?.toString() ?? null,
            salaryMin: job.salaryMin?.toString() ?? null,
            salaryMax: job.salaryMax?.toString() ?? null,
            rating: job.rating?.toString() ?? null,
          })),

          pagination: {
            page,
            limit,
            totalJobs,
            totalPages,
            hasNextPage: page < totalPages,
            hasPreviousPage: page > 1,
          },
        },
      },
      200,
      origin
    );
  } catch (error) {
    console.error("Company Details API Error:", error);

    return jsonResponse(
      {
        success: false,
        message: "Failed to fetch company details",
      },
      500,
      origin
    );
  }
}
