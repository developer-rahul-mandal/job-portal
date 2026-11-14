
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile, unlink } from "node:fs/promises";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/session";
import {
  RESUME_STORAGE_DIR,
  ensureResumeStorageDirectory,
  validateResumeFile,
} from "@/lib/resume-storage";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const ALLOWED_FILES = {
  ".pdf": {
    mime: "application/pdf",
  },
  ".doc": {
    mime: "application/msword",
  },
  ".docx": {
    mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  },
} as const;

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status }
  );
}

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    if (user.role !== "APPLICANT") {
      return errorResponse("Forbidden", 403);
    }

    const resumes = await prisma.applicantResume.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        title: true,
        fileName: true,
        mimeType: true,
        fileSize: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [
        {
          isDefault: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    return NextResponse.json({
      success: true,
      count: resumes.length,
      data: resumes,
    });
  } catch (error) {
    console.error("GET /api/me/resumes error:", error);

    return errorResponse("Failed to fetch resumes", 500);
  }
}

export async function POST(request: NextRequest) {
  let savedFilePath: string | null = null;

  try {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return errorResponse("Unauthorized", 401);
    }

    if (user.role !== "APPLICANT") {
      return errorResponse("Forbidden", 403);
    }

    const formData = await request.formData();

    const file = formData.get("file");
    const titleInput = formData.get("title");
    const isDefaultInput = formData.get("isDefault");

    if (!(file instanceof File)) {
      return errorResponse("Resume file is required", 400);
    }

    if (file.size === 0) {
      return errorResponse("File cannot be empty", 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return errorResponse("Maximum file size is 5 MB", 400);
    }

    const originalFileName = path.basename(file.name);

    if (!originalFileName || originalFileName === "." || originalFileName === "..") {
      return errorResponse("Invalid file name", 400);
    }

    const extension = path.extname(originalFileName).toLowerCase();

    if (!Object.prototype.hasOwnProperty.call(ALLOWED_FILES, extension)) {
      return errorResponse("Only PDF, DOC and DOCX files are allowed", 400);
    }

    const expectedMime =
      ALLOWED_FILES[extension as keyof typeof ALLOWED_FILES].mime;

    if (file.type !== expectedMime) {
      return errorResponse("File type does not match its extension", 400);
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (buffer.length !== file.size) {
      return errorResponse("Invalid file data", 400);
    }

    const isValidFile = validateResumeFile(
      buffer,
      extension,
    );

    if (!isValidFile) {
      return errorResponse("Invalid or corrupted resume file", 400);
    }

    let title = path.parse(originalFileName).name;

    if (typeof titleInput === "string" && titleInput.trim()) {
      title = titleInput.trim();
    }

    if (title.length > 150) {
      return errorResponse("Resume title cannot exceed 150 characters", 400);
    }

    const isDefault =
      isDefaultInput === "true" || isDefaultInput === "1";

    await ensureResumeStorageDirectory();

    const storageKey = `${randomUUID()}${extension}`;
    savedFilePath = path.join(RESUME_STORAGE_DIR, storageKey);

    await writeFile(savedFilePath, buffer, {
      flag: "wx",
      mode: 0o600,
    });

    const resume = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.applicantResume.updateMany({
          where: {
            userId: user.id,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      return tx.applicantResume.create({
        data: {
          userId: user.id,
          title,
          fileName: originalFileName,
          storageKey,
          mimeType: expectedMime,
          fileSize: buffer.length,
          isDefault,
        },
        select: {
          id: true,
          title: true,
          fileName: true,
          mimeType: true,
          fileSize: true,
          isDefault: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    });

    savedFilePath = null;

    return NextResponse.json(
      {
        success: true,
        message: "Resume uploaded successfully",
        data: resume,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/me/resumes error:", error);

    if (savedFilePath) {
      try {
        await unlink(savedFilePath);
      } catch (cleanupError) {
        console.error("Resume upload cleanup failed:", cleanupError);
      }
    }

    return errorResponse("Failed to upload resume", 500);
  }
}
