import { NextRequest, NextResponse } from "next/server";
import { requireRecruiterApi } from "@/lib/auth/recruiter";
import { prisma } from "@/lib/prisma";
import {
  readApplicationResumeFromDisk,
  isSafeApplicationResumeKey,
} from "@/lib/application-storage";

export const runtime = "nodejs";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ success: false, message }, { status });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireRecruiterApi(request, { requireCompany: true });
    if (!auth.success) return auth.response;

    const { company } = auth;
    const { id } = await params;

    if (!id) {
      return errorResponse("Application ID is required.", 400);
    }

    const application = await prisma.application.findUnique({
      where: { id },
      select: {
        id: true,
        resumeStorageKey: true,
        resumeFileName: true,
        resumeMimeType: true,
        job: {
          select: {
            companyId: true,
          },
        },
      },
    });

    if (!application) {
      return errorResponse("Application not found.", 404);
    }

    // Cross-company isolation
    if (application.job.companyId !== company.id) {
      return errorResponse(
        "Unauthorized: This application belongs to another company organization.",
        403
      );
    }

    if (!application.resumeStorageKey) {
      return errorResponse("No resume file associated with this application.", 404);
    }

    if (!isSafeApplicationResumeKey(application.resumeStorageKey)) {
      return errorResponse("Invalid resume storage key.", 400);
    }

    try {
      const buffer = await readApplicationResumeFromDisk(application.resumeStorageKey);
      const mime = application.resumeMimeType || "application/pdf";
      const rawName = application.resumeFileName || "applicant-resume.pdf";
      const sanitizedName = rawName.replace(/[^a-zA-Z0-9._-]/g, "_");

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": mime,
          "Content-Disposition": `inline; filename="${sanitizedName}"`,
          "X-Content-Type-Options": "nosniff",
          "Cache-Control": "private, no-cache, must-revalidate",
        },
      });
    } catch (fsErr) {
      console.error("Resume file read error:", fsErr);
      return errorResponse("Resume file could not be read from storage.", 404);
    }
  } catch (err) {
    console.error("GET /api/recruiter/applications/[id]/resume error:", err);
    return errorResponse("Failed to stream applicant resume.", 500);
  }
}
