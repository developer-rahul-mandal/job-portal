import { NextRequest, NextResponse } from "next/server";
import { requireRecruiterApi } from "@/lib/auth/recruiter";
import { prisma } from "@/lib/prisma";
import { normalizeCompanyDomain } from "@/lib/company-domain";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
  return `${base || "company"}-${Math.random().toString(36).slice(2, 8)}`;
}

// ======================================================
// GET /api/recruiter/company
// Returns the authenticated recruiter's company details & stats
// ======================================================
export async function GET(request: NextRequest) {
  const auth = await requireRecruiterApi(request, { requireCompany: true });
  if (!auth.success) return auth.response;

  const { company, membership } = auth;
  const now = new Date();

  const [activeJobs, draftJobs, totalJobs, stats] = await Promise.all([
    prisma.job.count({
      where: {
        companyId: company.id,
        status: "PUBLISHED",
        OR: [{ deadline: null }, { deadline: { gt: now } }],
      },
    }),
    prisma.job.count({
      where: {
        companyId: company.id,
        status: "DRAFT",
      },
    }),
    prisma.job.count({
      where: {
        companyId: company.id,
      },
    }),
    prisma.job.aggregate({
      where: { companyId: company.id },
      _sum: {
        applicationCount: true,
        applyClickCount: true,
      },
    }),
  ]);

  return NextResponse.json({
    success: true,
    data: {
      company,
      membershipRole: membership.membershipRole,
      verificationStatus: membership.verificationStatus,
      stats: {
        totalJobs,
        activeJobs,
        draftJobs,
        totalApplications: stats._sum.applicationCount ?? 0,
        totalApplyClicks: stats._sum.applyClickCount ?? 0,
      },
    },
  });
}

// ======================================================
// POST /api/recruiter/company
// Creates a new company for a recruiter with domain deduplication & active cookie
// ======================================================
export async function POST(request: NextRequest) {
  const auth = await requireRecruiterApi(request, { requireCompany: false });
  if (!auth.success) return auth.response;

  const { user } = auth;

  try {
    const body = await request.json();
    const { name, overview, industry, location, website, officialEmail } = body;

    // Validate name
    if (!name || typeof name !== "string" || name.trim().length < 2 || name.trim().length > 150) {
      return errorResponse("Company name is required and must be between 2 and 150 characters.", 400);
    }

    // Validate overview (Schema: VarChar(300))
    if (overview && (typeof overview !== "string" || overview.trim().length > 300)) {
      return errorResponse("Company overview cannot exceed 300 characters.", 400);
    }

    // Validate industry (Schema: VarChar(100))
    if (industry && (typeof industry !== "string" || industry.trim().length > 100)) {
      return errorResponse("Industry cannot exceed 100 characters.", 400);
    }

    // Validate location (Schema: VarChar(150))
    if (location && (typeof location !== "string" || location.trim().length > 150)) {
      return errorResponse("Location cannot exceed 150 characters.", 400);
    }

    // Validate website (Schema: VarChar(500))
    let cleanWebsite: string | null = null;
    if (website && typeof website === "string" && website.trim()) {
      cleanWebsite = website.trim();
      if (!cleanWebsite.startsWith("http://") && !cleanWebsite.startsWith("https://")) {
        cleanWebsite = `https://${cleanWebsite}`;
      }
      try {
        new URL(cleanWebsite);
      } catch {
        return errorResponse("Invalid company website URL.", 400);
      }
      if (cleanWebsite.length > 500) {
        return errorResponse("Website URL cannot exceed 500 characters.", 400);
      }
    }

    // Validate officialEmail (Schema: VarChar(254))
    let cleanEmail: string | null = null;
    if (officialEmail && typeof officialEmail === "string" && officialEmail.trim()) {
      cleanEmail = officialEmail.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 254) {
        return errorResponse("Invalid official company email address.", 400);
      }
    }

    // Domain normalization & deduplication check
    const normalizedDomain = normalizeCompanyDomain(cleanWebsite, cleanEmail);

    if (normalizedDomain) {
      const existingDomainCompany = await prisma.company.findFirst({
        where: { normalizedDomain },
        select: {
          id: true,
          name: true,
          slug: true,
          logo: true,
          industry: true,
          location: true,
          verification: true,
        },
      });

      if (existingDomainCompany) {
        return NextResponse.json(
          {
            success: false,
            duplicateFound: true,
            message: `An organization with the domain "${normalizedDomain}" already exists ("${existingDomainCompany.name}"). You can request to join it instead.`,
            existingCompany: existingDomainCompany,
          },
          { status: 409 }
        );
      }
    }

    const slug = generateSlug(name);

    // Atomically create company and recruiter membership
    const result = await prisma.$transaction(async (tx) => {
      const newCompany = await tx.company.create({
        data: {
          name: name.trim(),
          slug,
          overview: overview?.trim() || null,
          industry: industry?.trim() || null,
          location: location?.trim() || null,
          website: cleanWebsite,
          officialEmail: cleanEmail,
          normalizedDomain,
          verification: "UNVERIFIED",
        },
      });

      const newMembership = await tx.companyRecruiter.create({
        data: {
          userId: user.id,
          companyId: newCompany.id,
          membershipRole: "OWNER",
          status: "ACTIVE",
          verificationStatus: "UNVERIFIED",
        },
      });

      return { company: newCompany, membership: newMembership };
    });

    const response = NextResponse.json(
      {
        success: true,
        message: "Company created successfully and recruiter assigned as Owner.",
        data: result,
      },
      { status: 201 }
    );

    // Set newly created company as the active company
    response.cookies.set("active_company_id", result.company.id, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (err) {
    console.error("POST_RECRUITER_COMPANY_ERROR:", err);
    return errorResponse("Failed to create company.", 500);
  }
}

// ======================================================
// PATCH /api/recruiter/company
// Updates company profile (Requires Owner or Admin membership)
// ======================================================
export async function PATCH(request: NextRequest) {
  const auth = await requireRecruiterApi(request, {
    requireCompany: true,
    requireOwnerOrAdmin: true,
  });
  if (!auth.success) return auth.response;

  const { company } = auth;

  try {
    const body = await request.json();
    const { name, overview, industry, location, website, officialEmail } = body;

    const data: {
      name?: string;
      overview?: string | null;
      industry?: string | null;
      location?: string | null;
      website?: string | null;
      officialEmail?: string | null;
      normalizedDomain?: string | null;
    } = {};

    if ("name" in body) {
      if (!name || typeof name !== "string" || name.trim().length < 2 || name.trim().length > 150) {
        return errorResponse("Company name must be between 2 and 150 characters.", 400);
      }
      data.name = name.trim();
    }

    if ("overview" in body) {
      if (overview !== null && (typeof overview !== "string" || overview.trim().length > 300)) {
        return errorResponse("Company overview cannot exceed 300 characters.", 400);
      }
      data.overview = overview?.trim() || null;
    }

    if ("industry" in body) {
      if (industry !== null && (typeof industry !== "string" || industry.trim().length > 100)) {
        return errorResponse("Industry cannot exceed 100 characters.", 400);
      }
      data.industry = industry?.trim() || null;
    }

    if ("location" in body) {
      if (location !== null && (typeof location !== "string" || location.trim().length > 150)) {
        return errorResponse("Location cannot exceed 150 characters.", 400);
      }
      data.location = location?.trim() || null;
    }

    let nextWebsite = company.website;
    if ("website" in body) {
      if (website !== null && website !== "") {
        let clean = String(website).trim();
        if (!clean.startsWith("http://") && !clean.startsWith("https://")) {
          clean = `https://${clean}`;
        }
        try {
          new URL(clean);
        } catch {
          return errorResponse("Invalid website URL.", 400);
        }
        if (clean.length > 500) {
          return errorResponse("Website URL cannot exceed 500 characters.", 400);
        }
        data.website = clean;
        nextWebsite = clean;
      } else {
        data.website = null;
        nextWebsite = null;
      }
    }

    let nextEmail = company.officialEmail;
    if ("officialEmail" in body) {
      if (officialEmail !== null && officialEmail !== "") {
        const clean = String(officialEmail).trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean) || clean.length > 254) {
          return errorResponse("Invalid official company email address.", 400);
        }
        data.officialEmail = clean;
        nextEmail = clean;
      } else {
        data.officialEmail = null;
        nextEmail = null;
      }
    }

    if ("website" in body || "officialEmail" in body) {
      data.normalizedDomain = normalizeCompanyDomain(nextWebsite, nextEmail);
    }

    const updated = await prisma.company.update({
      where: { id: company.id },
      data,
    });

    return NextResponse.json({
      success: true,
      message: "Company profile updated successfully.",
      data: updated,
    });
  } catch (err) {
    console.error("PATCH_RECRUITER_COMPANY_ERROR:", err);
    return errorResponse("Failed to update company profile.", 500);
  }
}
