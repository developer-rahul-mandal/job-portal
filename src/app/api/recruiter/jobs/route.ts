import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireRecruiterApi } from "@/lib/auth/recruiter";
import { prisma } from "@/lib/prisma";
import {
  ApplicationMethod,
  EmploymentType,
  ExperienceLevel,
  JobStatus,
  SalaryPeriod,
  Prisma,
} from "@/generated/prisma/client";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

function generateJobSlug(title: string, companySlug: string): string {
  const cleanTitle = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  const cleanCompany = companySlug.slice(0, 40);
  const randomSuffix = Math.random().toString(36).slice(2, 8);
  return `${cleanTitle}-${cleanCompany}-${randomSuffix}`.slice(0, 180);
}

// ======================================================
// GET /api/recruiter/jobs
// Lists jobs belonging to the recruiter's company
// ======================================================
export async function GET(request: NextRequest) {
  const auth = await requireRecruiterApi(request, { requireCompany: true });
  if (!auth.success) return auth.response;

  const { company } = auth;
  const searchParams = request.nextUrl.searchParams;

  const statusParam = searchParams.get("status")?.toUpperCase();
  const q = searchParams.get("q")?.trim();
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(50, Math.max(1, Number.parseInt(searchParams.get("limit") || "10", 10) || 10));
  const skip = (page - 1) * limit;

  const validStatuses: JobStatus[] = [
    "DRAFT",
    "PENDING_REVIEW",
    "PUBLISHED",
    "REJECTED",
    "EXPIRED",
    "CLOSED",
  ];

  const where = {
    companyId: company.id,
    ...(statusParam && validStatuses.includes(statusParam as JobStatus)
      ? { status: statusParam as JobStatus }
      : {}),
    ...(q
      ? {
          OR: [
            { title: { contains: q } },
            { detailedTitle: { contains: q } },
            { role: { contains: q } },
            { location: { contains: q } },
          ],
        }
      : {}),
  };

  const [jobs, total] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        slug: true,
        title: true,
        detailedTitle: true,
        role: true,
        location: true,
        employmentType: true,
        experienceLevel: true,
        experienceYears: true,
        salaryMin: true,
        salaryMax: true,
        salaryCurrency: true,
        salaryPeriod: true,
        status: true,
        applicationMethod: true,
        applicationCount: true,
        applyClickCount: true,
        publishedAt: true,
        deadline: true,
        createdAt: true,
        updatedAt: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    }),
    prisma.job.count({ where }),
  ]);

  return NextResponse.json({
    success: true,
    data: jobs,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}

// ======================================================
// POST /api/recruiter/jobs
// Creates a new job under the recruiter's company
// ======================================================
export async function POST(request: NextRequest) {
  const auth = await requireRecruiterApi(request, { requireCompany: true });
  if (!auth.success) return auth.response;

  const { user, company } = auth;

  try {
    const body = await request.json();

    const {
      title,
      detailedTitle,
      role,
      categoryId,
      employmentType,
      experienceLevel,
      experienceYears,
      location,
      shortDescription,
      description,
      salaryMin,
      salaryMax,
      salaryCurrency = "INR",
      salaryPeriod = "MONTHLY",
      skills,
      qualifications,
      keywords,
      applicationMethod = "EXTERNAL",
      applicationUrl,
      applicationEmail,
      allowGuestApply = true,
      deadline,
      status = "DRAFT",
    } = body;

    // Validate title & detailedTitle
    const cleanDetailedTitle = typeof detailedTitle === "string" ? detailedTitle.trim() : "";
    const cleanTitle = typeof title === "string" ? title.trim() : "";

    const effectiveTitle = (cleanTitle || cleanDetailedTitle).slice(0, 37);
    const effectiveDetailedTitle = (cleanDetailedTitle || cleanTitle).slice(0, 250);

    if (!effectiveDetailedTitle || effectiveDetailedTitle.length < 3) {
      return errorResponse("Job title is required (minimum 3 characters).", 400);
    }

    // Role (Schema: VarChar(20))
    const cleanRole = (typeof role === "string" && role.trim() ? role.trim() : "Engineer").slice(0, 20);

    // Validate Category
    if (!categoryId || typeof categoryId !== "string") {
      return errorResponse("Job category is required.", 400);
    }
    const categoryExists = await prisma.category.findUnique({
      where: { id: categoryId, isActive: true },
    });
    if (!categoryExists) {
      return errorResponse("Selected category does not exist or is inactive.", 400);
    }

    // Validate EmploymentType
    const validEmploymentTypes: EmploymentType[] = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"];
    if (!validEmploymentTypes.includes(employmentType)) {
      return errorResponse("Invalid employment type.", 400);
    }

    // Validate ExperienceLevel
    const validExpLevels: ExperienceLevel[] = ["FRESHER", "EXPERIENCED"];
    if (!validExpLevels.includes(experienceLevel)) {
      return errorResponse("Invalid experience level.", 400);
    }

    // Location (Schema: VarChar(150))
    if (!location || typeof location !== "string" || location.trim().length > 150) {
      return errorResponse("Job location is required (maximum 150 characters).", 400);
    }

    // Short Description (Schema: VarChar(500))
    if (!shortDescription || typeof shortDescription !== "string" || shortDescription.trim().length > 500) {
      return errorResponse("Short description is required (maximum 500 characters).", 400);
    }

    // Full Description (Text)
    if (!description || typeof description !== "string" || description.trim().length < 10) {
      return errorResponse("Full job description is required (minimum 10 characters).", 400);
    }

    // Salaries
    let numSalaryMin: number | null = null;
    let numSalaryMax: number | null = null;
    if (salaryMin !== undefined && salaryMin !== null && salaryMin !== "") {
      numSalaryMin = Number(salaryMin);
      if (Number.isNaN(numSalaryMin) || numSalaryMin < 0) {
        return errorResponse("Salary minimum must be a valid positive number.", 400);
      }
    }
    if (salaryMax !== undefined && salaryMax !== null && salaryMax !== "") {
      numSalaryMax = Number(salaryMax);
      if (Number.isNaN(numSalaryMax) || numSalaryMax < 0) {
        return errorResponse("Salary maximum must be a valid positive number.", 400);
      }
    }
    if (numSalaryMin !== null && numSalaryMax !== null && numSalaryMin > numSalaryMax) {
      return errorResponse("Minimum salary cannot exceed maximum salary.", 400);
    }

    // Application Method Validation
    const validMethods: ApplicationMethod[] = ["INTERNAL", "EXTERNAL", "EMAIL"];
    if (!validMethods.includes(applicationMethod)) {
      return errorResponse("Invalid application method.", 400);
    }

    let cleanAppUrl: string | null = null;
    let cleanAppEmail: string | null = null;

    if (applicationMethod === "EXTERNAL") {
      if (!applicationUrl || typeof applicationUrl !== "string" || !applicationUrl.trim()) {
        return errorResponse("External application URL is required when application method is EXTERNAL.", 400);
      }
      cleanAppUrl = applicationUrl.trim();
      if (!cleanAppUrl.startsWith("http://") && !cleanAppUrl.startsWith("https://")) {
        cleanAppUrl = `https://${cleanAppUrl}`;
      }
      try {
        new URL(cleanAppUrl);
      } catch {
        return errorResponse("Invalid external application URL format.", 400);
      }
      if (cleanAppUrl.length > 1000) {
        return errorResponse("Application URL cannot exceed 1000 characters.", 400);
      }
    } else if (applicationMethod === "EMAIL") {
      if (!applicationEmail || typeof applicationEmail !== "string" || !applicationEmail.trim()) {
        return errorResponse("Application email address is required when application method is EMAIL.", 400);
      }
      cleanAppEmail = applicationEmail.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanAppEmail) || cleanAppEmail.length > 254) {
        return errorResponse("Invalid application email address format.", 400);
      }
    }

    // Status: allow DRAFT or PUBLISHED (subject to company moderation verification)
    let targetStatus: JobStatus = "DRAFT";
    if (status === "PUBLISHED") {
      targetStatus =
        company.verification === "VERIFIED" || user.role === "ADMIN"
          ? "PUBLISHED"
          : "PENDING_REVIEW";
    }
    const publishedAt = targetStatus === "PUBLISHED" ? new Date() : null;

    // Deadline validation
    let parsedDeadline: Date | null = null;
    if (deadline && typeof deadline === "string" && deadline.trim()) {
      const d = new Date(deadline);
      if (Number.isNaN(d.getTime())) {
        return errorResponse("Invalid deadline date format.", 400);
      }
      parsedDeadline = d;
    }

    const slug = generateJobSlug(effectiveDetailedTitle, company.slug);

    const job = await prisma.job.create({
      data: {
        slug,
        title: effectiveTitle,
        detailedTitle: effectiveDetailedTitle,
        role: cleanRole,
        companyId: company.id,
        categoryId,
        postedById: user.id,
        employmentType,
        experienceLevel,
        experienceYears: experienceYears ? Number(experienceYears) : null,
        location: location.trim(),
        shortDescription: shortDescription.trim(),
        description: description.trim(),
        salaryMin: numSalaryMin,
        salaryMax: numSalaryMax,
        salaryCurrency: String(salaryCurrency || "INR").slice(0, 3).toUpperCase(),
        salaryPeriod: (salaryPeriod as SalaryPeriod) || "NOT_DISCLOSED",
        skills: Array.isArray(skills) ? skills : Prisma.JsonNull,
        qualifications: qualifications ? qualifications : Prisma.JsonNull,
        keywords: Array.isArray(keywords) ? keywords : Prisma.JsonNull,
        applicationMethod,
        applicationUrl: cleanAppUrl,
        applicationEmail: cleanAppEmail,
        allowGuestApply: Boolean(allowGuestApply),
        deadline: parsedDeadline,
        status: targetStatus,
        publishedAt,
      },
    });

    // Revalidate public feeds if published
    if (targetStatus === "PUBLISHED") {
      revalidatePath("/jobs");
      revalidatePath(`/companies/${company.slug}`);
      revalidatePath(`/categories/${categoryExists.slug}`);
      revalidatePath("/");
    }

    return NextResponse.json(
      {
        success: true,
        message:
          targetStatus === "PUBLISHED"
            ? "Job published successfully!"
            : targetStatus === "PENDING_REVIEW"
            ? "Job submitted for moderation review (unverified employer)."
            : "Job saved as draft.",
        data: job,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("POST_RECRUITER_JOB_ERROR:", err);
    return errorResponse("Failed to create job posting.", 500);
  }
}
