
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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

export async function GET(request: NextRequest) {
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
    const now = new Date();

    const companies = await prisma.company.findMany({
      orderBy: {
        name: "asc",
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

        _count: {
          select: {
            jobs: {
              where: {
                status: "PUBLISHED",
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
              },
            },
          },
        },
      },
    });

    const formattedCompanies = companies.map((company) => ({
      id: company.id,
      name: company.name,
      slug: company.slug,
      overview: company.overview,
      industry: company.industry,
      logo: company.logo,
      website: company.website,
      officialEmail: company.officialEmail,
      location: company.location,
      verification: company.verification,
      rating: company.rating?.toString() ?? null,
      jobCount: company._count.jobs,
    }));

    return jsonResponse(
      {
        success: true,
        count: formattedCompanies.length,
        data: formattedCompanies,
      },
      200,
      origin
    );
  } catch (error) {
    console.error("Companies API Error:", error);

    return jsonResponse(
      {
        success: false,
        message: "Failed to fetch companies",
      },
      500,
      origin
    );
  }
}
