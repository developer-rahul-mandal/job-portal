import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { preserveResumeForApplication } from "@/lib/application-storage";
import {
  notifyApplicationSubmitted,
  notifyRecruiterNewApplication,
} from "@/lib/notifications";

function isPrismaUniqueConstraintError(
  error: unknown
): error is { code: "P2002" } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    // 1. Authenticate user using existing session cookie.
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return errorResponse("Authentication required to submit an application.", 401);
    }

    // Role check: Only APPLICANT accounts can apply.
    if (user.role !== "APPLICANT") {
      return errorResponse(
        "Only candidate (APPLICANT) accounts can submit job applications. Recruiters and administrators cannot submit applications.",
        403
      );
    }

    // 2. Validate request body
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("resumeId" in body) ||
      typeof body.resumeId !== "string" ||
      !body.resumeId.trim()
    ) {
      return errorResponse("A valid resumeId is required to submit an application.", 400);
    }

    const resumeId = body.resumeId.trim();

    const coverLetter =
      "coverLetter" in body && typeof body.coverLetter === "string"
        ? body.coverLetter.trim()
        : null;

    if (coverLetter && coverLetter.length > 10000) {
      return errorResponse("Cover letter cannot exceed 10,000 characters.", 400);
    }

    // 3. Resolve job by slug
    const { slug } = await params;

    if (!slug?.trim()) {
      return errorResponse("Job slug is required.", 400);
    }

    const job = await prisma.job.findUnique({
      where: { slug: slug.trim() },
      select: {
        id: true,
        title: true,
        status: true,
        applicationMethod: true,
        deadline: true,
        company: {
          select: {
            id: true,
            name: true,
            officialEmail: true,
            recruiters: {
              where: { status: "ACTIVE" },
              select: {
                user: { select: { email: true } },
              },
              take: 1,
            },
          },
        },
      },
    });

    if (!job || job.status !== "PUBLISHED") {
      return errorResponse("This job posting is not available for applications.", 404);
    }

    if (job.deadline && job.deadline <= new Date()) {
      return errorResponse("The application deadline for this position has passed.", 400);
    }

    if (job.applicationMethod !== "INTERNAL") {
      return errorResponse("This job does not accept direct internal applications.", 400);
    }

    // 4. Duplicate application check (pre-transaction check)
    const existingApplication = await prisma.application.findUnique({
      where: {
        jobId_userId: {
          jobId: job.id,
          userId: user.id,
        },
      },
      select: { id: true, status: true },
    });

    if (existingApplication) {
      return errorResponse(
        "You have already submitted an application for this position.",
        409
      );
    }

    // 5. Verify the selected resume belongs to the applicant and is physically accessible
    const resume = await prisma.applicantResume.findFirst({
      where: {
        id: resumeId,
        userId: user.id,
      },
    });

    if (!resume) {
      return errorResponse(
        "The selected resume does not exist or does not belong to your account.",
        400
      );
    }

    // 6. Gather applicant's current profile records for the application-time snapshot
    const [profile, education, experience, skills] = await Promise.all([
      prisma.userProfile.findUnique({
        where: { userId: user.id },
      }),
      prisma.applicantEducation.findMany({
        where: { userId: user.id },
        orderBy: [{ startDate: "desc" }],
      }),
      prisma.applicantExperience.findMany({
        where: { userId: user.id },
        orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
      }),
      prisma.applicantSkill.findMany({
        where: { userId: user.id },
        include: { skill: { select: { id: true, name: true, slug: true } } },
      }),
    ]);

    const profileSnapshot = {
      capturedAt: new Date().toISOString(),
      name: user.name || user.email.split("@")[0],
      email: user.email,
      phone: profile?.phone || null,
      location: profile?.location || null,
      headline: profile?.headline || null,
      bio: profile?.bio || null,
      applicant: {
        id: user.id,
        name: user.name || user.email.split("@")[0],
        email: user.email,
        phone: profile?.phone || null,
        location: profile?.location || null,
        headline: profile?.headline || null,
        bio: profile?.bio || null,
      },
      education: education.map((edu) => ({
        id: edu.id,
        institution: edu.institution,
        degree: edu.degree,
        fieldOfStudy: edu.fieldOfStudy,
        startDate: edu.startDate.toISOString(),
        endDate: edu.endDate ? edu.endDate.toISOString() : null,
        isCurrentlyStudying: edu.isCurrentlyStudying,
        grade: edu.grade,
        description: edu.description,
      })),
      experience: experience.map((exp) => ({
        id: exp.id,
        companyName: exp.companyName,
        jobTitle: exp.jobTitle,
        employmentType: exp.employmentType,
        location: exp.location,
        startDate: exp.startDate.toISOString(),
        endDate: exp.endDate ? exp.endDate.toISOString() : null,
        isCurrent: exp.isCurrent,
        description: exp.description,
      })),
      skills: skills.map((sk) => ({
        id: sk.skill.id,
        name: sk.skill.name,
        slug: sk.skill.slug,
      })),
      resume: {
        resumeId: resume.id,
        originalTitle: resume.title,
        fileName: resume.fileName,
        mimeType: resume.mimeType,
        fileSize: resume.fileSize,
      },
    };

    // 7. Preserve an immutable physical copy of the submitted resume
    let preservedStorageKey: string | null = null;
    try {
      preservedStorageKey = await preserveResumeForApplication(resume.storageKey);
    } catch (storageErr) {
      console.error("Failed to copy resume for application:", storageErr);
      return errorResponse("The selected resume file could not be accessed from storage.", 500);
    }

    const applicantName = user.name?.trim() || user.email.split("@")[0];

    // 8. Atomically create Application, create initial ApplicationStatusHistory, and increment Job.applicationCount
    const createdApp = await prisma.$transaction(async (tx) => {
      const application = await tx.application.create({
        data: {
          jobId: job.id,
          userId: user.id,
          applicantName,
          applicantEmail: user.email,
          resumeUrl: `/api/me/applications`,
          resumeId: resume.id,
          resumeStorageKey: preservedStorageKey,
          resumeFileName: resume.fileName,
          resumeMimeType: resume.mimeType,
          resumeFileSize: resume.fileSize,
          coverLetter,
          profileSnapshot,
          status: "SUBMITTED",
        },
      });

      await tx.applicationStatusHistory.create({
        data: {
          applicationId: application.id,
          previousStatus: null,
          newStatus: "SUBMITTED",
          changedById: user.id,
          reason: "Candidate application submission",
        },
      });

      await tx.job.update({
        where: { id: job.id },
        data: {
          applicationCount: {
            increment: 1,
          },
        },
      });

      return application;
    });

    // 9. Dispatch notifications (async, non-blocking)
    notifyApplicationSubmitted({
      applicantEmail: user.email,
      applicantName,
      jobTitle: job.title,
      companyName: job.company.name,
    }).catch((err) => console.error("notifyApplicationSubmitted error:", err));

    const recruiterEmail =
      job.company.recruiters[0]?.user.email || job.company.officialEmail;
    if (recruiterEmail) {
      notifyRecruiterNewApplication({
        recruiterEmail,
        applicantName,
        jobTitle: job.title,
        companyName: job.company.name,
      }).catch((err) => console.error("notifyRecruiterNewApplication error:", err));
    }

    return NextResponse.json(
      {
        success: true,
        message: "Your application has been submitted successfully!",
        data: {
          id: createdApp.id,
          jobId: createdApp.jobId,
          status: createdApp.status,
          createdAt: createdApp.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return errorResponse("You have already applied for this job.", 409);
    }

    console.error("POST /api/jobs/[slug]/apply error:", error);
    return errorResponse("Failed to submit application. Please try again.", 500);
  }
}
