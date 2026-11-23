import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/session";
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
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    if (user.role !== "APPLICANT") {
      return errorResponse("Forbidden", 403);
    }

    const { id } = await params;

    if (!id) {
      return errorResponse("Application ID is required", 400);
    }

    const application = await prisma.application.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        resumeStorageKey: true,
        resumeFileName: true,
        resumeMimeType: true,
      },
    });

    if (!application) {
      return errorResponse("Application not found", 404);
    }

    // Ownership check
    if (application.userId !== user.id) {
      return errorResponse("Unauthorized: You do not own this application", 403);
    }

    if (!application.resumeStorageKey) {
      return errorResponse("No resume file associated with this application", 404);
    }

    if (!isSafeApplicationResumeKey(application.resumeStorageKey)) {
      return errorResponse("Invalid resume storage key", 400);
    }

    try {
      const buffer = await readApplicationResumeFromDisk(application.resumeStorageKey);
      const mime = application.resumeMimeType || "application/pdf";
      const rawName = application.resumeFileName || "submitted-resume.pdf";
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
      return errorResponse("Resume file could not be read from storage", 404);
    }
  } catch (err) {
    console.error("GET /api/me/applications/[id]/resume error:", err);
    return errorResponse("Failed to stream application resume", 500);
  }
}
