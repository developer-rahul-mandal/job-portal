import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

const employmentTypes = [
  "FULL_TIME",
  "PART_TIME",
  "CONTRACT",
  "INTERNSHIP",
] as const;

const allowedOrigins = (
  process.env.CORS_ALLOWED_ORIGINS ??
  (process.env.NODE_ENV === "development"
    ? "http://localhost:3000,http://127.0.0.1:3000"
    : "")
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const corsHeaders = (origin: string | null): Headers => {
  const headers = new Headers({
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  });

  if (origin && allowedOrigins.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
  }

  return headers;
};

const jsonResponse = (
  data: unknown,
  status: number,
  origin: string | null,
) => {
  const headers = corsHeaders(origin);
  headers.set("Content-Type", "application/json");

  return Response.json(data, {
    status,
    headers,
  });
};

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");

  if (origin && !allowedOrigins.includes(origin)) {
    return jsonResponse(
      {
        success: false,
        message: "Origin not allowed by CORS policy",
      },
      403,
      null,
    );
  }

  return new Response(null, {
    status: 204,
    headers: corsHeaders(origin),
  });
}

export async function GET(request: Request) {
  const origin = request.headers.get("origin");

  if (origin && !allowedOrigins.includes(origin)) {
    return jsonResponse(
      {
        success: false,
        message: "Origin not allowed by CORS policy",
      },
      403,
      null,
    );
  }

  try {
    const { searchParams } = new URL(request.url);

    const q = searchParams.get("q")?.trim() || "";
    const skill = searchParams.get("skill")?.trim() || "";
    const company = searchParams.get("company")?.trim() || "";
    const category = searchParams.get("category")?.trim() || "";
    const location = searchParams.get("location")?.trim() || "";
    const type = searchParams.get("type")?.trim() || "";

    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10) || 1,
    );

    const limit = Math.min(
      50,
      Math.max(
        1,
        Number.parseInt(searchParams.get("limit") || "10", 10) || 10,
      ),
    );

    if (
      type &&
      !employmentTypes.includes(type as (typeof employmentTypes)[number])
    ) {
      return jsonResponse(
        {
          success: false,
          message: "Invalid employment type",
          allowedTypes: employmentTypes,
        },
        400,
        origin,
      );
    }

    const searchTerms = q
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 8);

    const searchConditions: Prisma.JobWhereInput[] = searchTerms.map(
      (term) => ({
        OR: [
          { title: { contains: term } },
          { shortDescription: { contains: term } },
          { description: { contains: term } },
          { role: { contains: term } },
          { location: { contains: term } },

          {
            company: {
              name: { contains: term },
            },
          },

          {
            category: {
              name: { contains: term },
            },
          },

          {
            skills: {
              array_contains: [term],
            },
          },

          {
            keywords: {
              array_contains: [term],
            },
          },
        ],
      }),
    );

    const where: Prisma.JobWhereInput = {
      status: "PUBLISHED",

      AND: [
        // Every search term must match at least one searchable field.
        ...searchConditions,

        // Skill filter
        ...(skill
          ? [
              {
                skills: {
                  array_contains: [skill],
                },
              },
            ]
          : []),

        // Company filter
        ...(company
          ? [
              {
                company: {
                  name: {
                    contains: company,
                  },
                },
              },
            ]
          : []),

        // Category filter
        ...(category
          ? [
              {
                category: {
                  name: {
                    contains: category,
                  },
                },
              },
            ]
          : []),

        // Location filter
        ...(location
          ? [
              {
                location: {
                  contains: location,
                },
              },
            ]
          : []),

        // Employment type filter
        ...(type
          ? [
              {
                employmentType:
                  type as (typeof employmentTypes)[number],
              },
            ]
          : []),

        // Ignore jobs whose application deadline has passed.
        {
          OR: [
            { deadline: null },
            { deadline: { gt: new Date() } },
          ],
        },
      ],
    };

    const skip = (page - 1) * limit;

    const [jobs, total] = await Promise.all([
      prisma.job.findMany({
        where,

        select: {
          id: true,
          slug: true,
          title: true,
          shortDescription: true,
          role: true,
          location: true,
          employmentType: true,
          experienceLevel: true,
          experienceYears: true,
          salaryMin: true,
          salaryMax: true,
          salaryCurrency: true,
          salaryPeriod: true,
          skills: true,
          keywords: true,
          publishedAt: true,
          deadline: true,

          company: {
            select: {
              id: true,
              name: true,
              slug: true,
              logo: true,
              location: true,
              verification: true,
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

        orderBy: [
          { publishedAt: "desc" },
          { id: "desc" },
        ],

        skip,
        take: limit,
      }),

      prisma.job.count({
        where,
      }),
    ]);

    return jsonResponse(
      {
        success: true,

        filters: {
          q,
          skill,
          company,
          category,
          location,
          type,
        },

        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
          hasPreviousPage: page > 1,
        },

        count: jobs.length,
        data: jobs,
      },
      200,
      origin,
    );
  } catch (error) {
    console.error("GET /api/jobs error:");
    console.dir(error, { depth: 10 });

    return jsonResponse(
      {
        success: false,
        message: "Failed to fetch jobs",
      },
      500,
      origin,
    );
  }
}