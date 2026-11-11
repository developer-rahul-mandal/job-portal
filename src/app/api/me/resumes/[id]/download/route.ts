
import { NextRequest, NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const STORAGE_DIR = path.resolve(
  process.env.RESUME_STORAGE_PATH || "./private/resumes"
);

const MIME_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function GET(
  request: NextRequest,
  { params }: RouteContext
) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized" },
        { status: 401 }
      );
    }

    if (user.role !== "APPLICANT") {
      return NextResponse.json(
        { success: false, message: "Only applicants can access this endpoint" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const resume = await prisma.applicantResume.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        fileName: true,
        storageKey: true,
        mimeType: true,
        fileSize: true,
      },
    });

    if (!resume) {
      return NextResponse.json(
        { success: false, message: "Resume not found" },
        { status: 404 }
      );
    }

    if (!/^[0-9a-f-]{36}\.(pdf|doc|docx)$/i.test(resume.storageKey)) {
      return NextResponse.json(
        { success: false, message: "Invalid resume storage key" },
        { status: 500 }
      );
    }

    const extension = path.extname(resume.storageKey).toLowerCase();
    const expectedMimeType = MIME_TYPES[extension];

    if (!expectedMimeType || resume.mimeType !== expectedMimeType) {
      return NextResponse.json(
        { success: false, message: "Invalid resume file metadata" },
        { status: 500 }
      );
    }

    const filePath = path.join(STORAGE_DIR, resume.storageKey);

    const fileBuffer = await readFile(filePath);

    if (fileBuffer.length !== resume.fileSize) {
      return NextResponse.json(
        { success: false, message: "Resume file integrity check failed" },
        { status: 500 }
      );
    }

    const safeFileName = resume.fileName
      .replace(/[\r\n"]/g, "_")
      .replace(/[^\x20-\x7E]/g, "_");

    return new NextResponse(new Uint8Array(fileBuffer), {
      status: 200,
      headers: {
        "Content-Type": resume.mimeType,
        "Content-Length": String(fileBuffer.length),
        "Content-Disposition": `attachment; filename="${safeFileName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return NextResponse.json(
        { success: false, message: "Resume file not found in storage" },
        { status: 404 }
      );
    }

    console.error("Resume download error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to download resume" },
      { status: 500 }
    );
  }
}
