
import { prisma } from "@/lib/prisma";

const allowedOrigins = (
  process.env.CORS_ALLOWED_ORIGINS ??
  (process.env.NODE_ENV === "development"
    ? "http://localhost:3000,http://127.0.0.1:3000"
    : "")
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

function getCorsHeaders(origin: string | null) {
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
}

function jsonResponse(
  data: unknown,
  status: number,
  origin: string | null,
) {
  const headers = getCorsHeaders(origin);
  headers.set("Content-Type", "application/json");

  return Response.json(data, {
    status,
    headers,
  });
}

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
    headers: getCorsHeaders(origin),
  });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
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
    const { slug } = await params;

    if (!slug?.trim()) {
      return jsonResponse(
        {
          success: false,
          message: "Job slug is required",
        },
        400,
        origin,
      );
    }

    const job = await prisma.job.findFirst({
      where: {
        slug,
        status: "PUBLISHED",

        OR: [
          { deadline: null },
          { deadline: { gt: new Date() } },
        ],
      },

      select: {
        id: true,
        slug: true,
        title: true,
        shortDescription: true,
        role: true,
        detailedTitle: true,
        description: true,
        location: true,
        employmentType: true,
        experienceLevel: true,
        experienceYears: true,
        salaryMin: true,
        salaryMax: true,
        salaryCurrency: true,
        salaryPeriod: true,

        qualifications: true,
        skills: true,
        experienceDetails: true,
        otherData: true,
        keywords: true,

        logo: true,
        rating: true,

        metaTitle: true,
        metaDescription: true,
        canonicalUrl: true,
        ogTitle: true,
        ogDescription: true,
        ogImage: true,
        ogImageAlt: true,
        ogType: true,

        status: true,
        applicationMethod: true,
        applicationUrl: true,
        applicationEmail: true,
        allowGuestApply: true,
        applicationCount: true,
        applyClickCount: true,

        publishedAt: true,
        deadline: true,
        closedAt: true,
        createdAt: true,
        updatedAt: true,

        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
          },
        },

        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      }
    });

    if (!job) {
      return jsonResponse(
        {
          success: false,
          message: "Job not found or no longer available",
        },
        404,
        origin,
      );
    }

    return jsonResponse(
      {
        success: true,
        data: job,
      },
      200,
      origin,
    );
  } catch (error) {
    console.error("GET /api/jobs/[slug] error:");
    console.dir(error, { depth: 10 });

    return jsonResponse(
      {
        success: false,
        message: "Failed to fetch job details",
      },
      500,
      origin,
    );
  }
}
