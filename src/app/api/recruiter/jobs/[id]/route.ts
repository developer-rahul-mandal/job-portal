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

// ======================================================
// GET /api/recruiter/jobs/[id]
// Retrieves a single job for editing, verifying ownership
// ======================================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRecruiterApi(request, { requireCompany: true });
  if (!auth.success) return auth.response;

  const { company } = auth;
  const { id } = await params;

  if (!id) return errorResponse("Job ID required.", 400);

  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      category: {
        select: { id: true, name: true, slug: true },
      },
      company: {
        select: { id: true, name: true, slug: true },
      },
    },
  });

  if (!job) {
    return errorResponse("Job not found.", 404);
  }

  // Cross-company isolation enforcement
  if (job.companyId !== company.id) {
    return errorResponse("Unauthorized: This job belongs to another organization.", 403);
  }

  return NextResponse.json({ success: true, data: job });
}

// ======================================================
// PATCH /api/recruiter/jobs/[id]
// Updates job posting details or toggles status (Publish/Close/Draft)
// ======================================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRecruiterApi(request, { requireCompany: true });
  if (!auth.success) return auth.response;

  const { user, company } = auth;
  const { id } = await params;

  if (!id) return errorResponse("Job ID required.", 400);

  const existingJob = await prisma.job.findUnique({
    where: { id },
    include: { category: true },
  });

  if (!existingJob) {
    return errorResponse("Job not found.", 404);
  }

  if (existingJob.companyId !== company.id) {
    return errorResponse("Unauthorized: This job belongs to another organization.", 403);
  }

  try {
    const body = await request.json();

    const data: Record<string, unknown> = {};

    if ("title" in body || "detailedTitle" in body) {
      const detailed = typeof body.detailedTitle === "string" ? body.detailedTitle.trim() : existingJob.detailedTitle;
      const short = typeof body.title === "string" ? body.title.trim() : existingJob.title;
      data.detailedTitle = detailed.slice(0, 250);
      data.title = (short || detailed).slice(0, 37);
    }

    if ("role" in body && typeof body.role === "string") {
      data.role = body.role.trim().slice(0, 20);
    }

    if ("categoryId" in body) {
      const cat = await prisma.category.findUnique({ where: { id: body.categoryId, isActive: true } });
      if (!cat) return errorResponse("Invalid or inactive category selected.", 400);
      data.categoryId = cat.id;
    }

    if ("employmentType" in body) {
      const validTypes: EmploymentType[] = ["FULL_TIME", "PART_TIME", "CONTRACT", "INTERNSHIP"];
      if (!validTypes.includes(body.employmentType)) return errorResponse("Invalid employment type.", 400);
      data.employmentType = body.employmentType;
    }

    if ("experienceLevel" in body) {
      const validExp: ExperienceLevel[] = ["FRESHER", "EXPERIENCED"];
      if (!validExp.includes(body.experienceLevel)) return errorResponse("Invalid experience level.", 400);
      data.experienceLevel = body.experienceLevel;
    }

    if ("experienceYears" in body) {
      data.experienceYears = body.experienceYears ? Number(body.experienceYears) : null;
    }

    if ("location" in body && typeof body.location === "string") {
      if (!body.location.trim() || body.location.trim().length > 150) {
        return errorResponse("Location cannot exceed 150 characters.", 400);
      }
      data.location = body.location.trim();
    }

    if ("shortDescription" in body && typeof body.shortDescription === "string") {
      if (body.shortDescription.trim().length > 500) {
        return errorResponse("Short description cannot exceed 500 characters.", 400);
      }
      data.shortDescription = body.shortDescription.trim();
    }

    if ("description" in body && typeof body.description === "string") {
      if (!body.description.trim()) return errorResponse("Description is required.", 400);
      data.description = body.description.trim();
    }

    // Salary validation
    if ("salaryMin" in body || "salaryMax" in body) {
      const sMin = "salaryMin" in body ? (body.salaryMin ? Number(body.salaryMin) : null) : (existingJob.salaryMin ? Number(existingJob.salaryMin) : null);
      const sMax = "salaryMax" in body ? (body.salaryMax ? Number(body.salaryMax) : null) : (existingJob.salaryMax ? Number(existingJob.salaryMax) : null);
      if (sMin !== null && sMax !== null && sMin > sMax) {
        return errorResponse("Salary minimum cannot exceed salary maximum.", 400);
      }
      if ("salaryMin" in body) data.salaryMin = sMin;
      if ("salaryMax" in body) data.salaryMax = sMax;
    }

    if ("salaryCurrency" in body) {
      data.salaryCurrency = String(body.salaryCurrency || "INR").slice(0, 3).toUpperCase();
    }

    if ("salaryPeriod" in body) {
      data.salaryPeriod = (body.salaryPeriod as SalaryPeriod) || "NOT_DISCLOSED";
    }

    if ("skills" in body) {
      data.skills = Array.isArray(body.skills) ? body.skills : Prisma.JsonNull;
    }

    if ("qualifications" in body) {
      data.qualifications = body.qualifications || Prisma.JsonNull;
    }

    if ("keywords" in body) {
      data.keywords = Array.isArray(body.keywords) ? body.keywords : Prisma.JsonNull;
    }

    if ("applicationMethod" in body) {
      const validMethods: ApplicationMethod[] = ["INTERNAL", "EXTERNAL", "EMAIL"];
      if (!validMethods.includes(body.applicationMethod)) {
        return errorResponse("Invalid application method.", 400);
      }
      data.applicationMethod = body.applicationMethod;

      if (body.applicationMethod === "EXTERNAL") {
        const url = String(body.applicationUrl || existingJob.applicationUrl || "").trim();
        if (!url || (!url.startsWith("http://") && !url.startsWith("https://"))) {
          return errorResponse("Valid HTTP/HTTPS application URL required for external jobs.", 400);
        }
        data.applicationUrl = url;
      } else if (body.applicationMethod === "EMAIL") {
        const email = String(body.applicationEmail || existingJob.applicationEmail || "").trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return errorResponse("Valid application email address required for email application method.", 400);
        }
        data.applicationEmail = email;
      }
    }

    if ("allowGuestApply" in body) {
      data.allowGuestApply = Boolean(body.allowGuestApply);
    }

    if ("deadline" in body) {
      data.deadline = body.deadline ? new Date(body.deadline) : null;
    }

    // Status management: DRAFT, PENDING_REVIEW, PUBLISHED, CLOSED (enforcing moderation verification)
    if ("status" in body) {
      let newStatus = body.status as JobStatus;
      const validStatuses: JobStatus[] = ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "CLOSED"];
      if (!validStatuses.includes(newStatus)) {
        return errorResponse("Invalid status update.", 400);
      }
      if (newStatus === "PUBLISHED" && user.role !== "ADMIN") {
        newStatus = "PENDING_REVIEW";
      }
      data.status = newStatus;

      if (newStatus === "PUBLISHED" && !existingJob.publishedAt) {
        data.publishedAt = new Date();
      }
      if (newStatus === "CLOSED") {
        data.closedAt = new Date();
      }
    } else if (existingJob.status === "PUBLISHED" && user.role !== "ADMIN") {
      // Content modification on a published job resets it to PENDING_REVIEW for re-moderation
      data.status = "PENDING_REVIEW";
    }

    const updatedJob = await prisma.job.update({
      where: { id: existingJob.id },
      data,
    });

    // Revalidate public routes
    revalidatePath("/jobs");
    revalidatePath(`/jobs/${existingJob.slug}`);
    revalidatePath(`/companies/${company.slug}`);
    if (existingJob.category?.slug) {
      revalidatePath(`/categories/${existingJob.category.slug}`);
    }
    revalidatePath("/");

    return NextResponse.json({
      success: true,
      message: "Job updated successfully.",
      data: updatedJob,
    });
  } catch (err) {
    console.error("PATCH_RECRUITER_JOB_ERROR:", err);
    return errorResponse("Failed to update job.", 500);
  }
}

// ======================================================
// DELETE /api/recruiter/jobs/[id]
// Deletes a DRAFT job (Published/closed jobs must be closed rather than deleted)
// ======================================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRecruiterApi(request, { requireCompany: true });
  if (!auth.success) return auth.response;

  const { company } = auth;
  const { id } = await params;

  if (!id) return errorResponse("Job ID required.", 400);

  const job = await prisma.job.findUnique({
    where: { id },
    select: {
      id: true,
      companyId: true,
      status: true,
      _count: { select: { applications: true } },
    },
  });

  if (!job) {
    return errorResponse("Job not found.", 404);
  }

  if (job.companyId !== company.id) {
    return errorResponse("Unauthorized: This job belongs to another organization.", 403);
  }

  // Deletion allowed only for DRAFT jobs without submitted applications
  if (job.status !== "DRAFT" || job._count.applications > 0) {
    return errorResponse(
      "Only draft jobs without candidate applications can be deleted. Published or active jobs must be Closed.",
      400
    );
  }

  await prisma.job.delete({
    where: { id: job.id },
  });

  return NextResponse.json({
    success: true,
    message: "Draft job deleted successfully.",
  });
}
