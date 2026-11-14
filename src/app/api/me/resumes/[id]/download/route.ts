
import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { getResumeFilePath } from "@/lib/resume-storage";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status }
  );
}

function getSafeFileName(fileName: string): string {
  const baseName = path.basename(fileName);

  return baseName
    .replace(/[\r\n"]/g, "")
    .replace(/[^\x20-\x7E]/g, "_")
    .slice(0, 200);
}

export async function GET(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    if (user.role !== "APPLICANT") {
      return errorResponse("Forbidden", 403);
    }

    const { id } = await context.params;

    if (!id) {
      return errorResponse("Resume ID is required", 400);
    }

    const resume = await prisma.applicantResume.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
        fileName: true,
        storageKey: true,
        mimeType: true,
        fileSize: true,
      },
    });

    if (!resume) {
      return errorResponse("Resume not found", 404);
    }

    let filePath: string;

    try {
      filePath = getResumeFilePath(resume.storageKey);
    } catch {
      console.error("Invalid resume storage key:", resume.id);

      return errorResponse("Invalid resume file reference", 500);
    }

    const fileStats = await stat(filePath);

    if (!fileStats.isFile() || fileStats.size === 0) {
      return errorResponse("Resume file is unavailable", 404);
    }

    if (fileStats.size !== resume.fileSize) {
      console.error("Resume file size mismatch:", resume.id);

      return errorResponse("Resume file integrity check failed", 500);
    }

    const buffer = await readFile(filePath);

    const safeFileName = getSafeFileName(resume.fileName);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": resume.mimeType,
        "Content-Length": String(buffer.length),
        "Content-Disposition": `attachment; filename="${safeFileName}"`,
        "Cache-Control": "private, no-store, max-age=0",
        Pragma: "no-cache",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "sandbox",
      },
    });
  } catch (error) {
    console.error("GET /api/me/resumes/[id]/download error:", error);

    return errorResponse("Failed to download resume", 500);
  }
}
