
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { mkdir, writeFile, unlink } from "node:fs/promises";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

const STORAGE_DIR = path.resolve(
  process.env.RESUME_STORAGE_PATH || "./private/resumes"
);

const ALLOWED_TYPES = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
} as const;

function validateFileSignature(
  buffer: Buffer,
  extension: string
): boolean {
  if (extension === ".pdf") {
    return buffer.subarray(0, 5).toString() === "%PDF-";
  }

  if (extension === ".doc") {
    return buffer.subarray(0, 8).equals(
      Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1])
    );
  }

  if (extension === ".docx") {
    // DOCX is a ZIP-based format.
    return (
      buffer.length >= 4 &&
      buffer[0] === 0x50 &&
      buffer[1] === 0x4b &&
      buffer[2] === 0x03 &&
      buffer[3] === 0x04
    );
  }

  return false;
}

export async function POST(request: NextRequest) {
  let savedFilePath: string | null = null;

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
        { success: false, message: "Only applicants can upload resumes" },
        { status: 403 }
      );
    }

    const formData = await request.formData();

    const file = formData.get("file");
    const titleValue = formData.get("title");
    const isDefaultValue = formData.get("isDefault");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, message: "Resume file is required" },
        { status: 400 }
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { success: false, message: "Empty files are not allowed" },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: "Maximum file size is 5 MB" },
        { status: 413 }
      );
    }

    const originalName = path.basename(file.name);
    const extension = path.extname(originalName).toLowerCase();

    if (!Object.hasOwn(ALLOWED_TYPES, extension)) {
      return NextResponse.json(
        { success: false, message: "Only PDF, DOC and DOCX files are allowed" },
        { status: 400 }
      );
    }

    const expectedMimeType =
      ALLOWED_TYPES[extension as keyof typeof ALLOWED_TYPES];

    if (file.type !== expectedMimeType) {
      return NextResponse.json(
        { success: false, message: "Invalid file MIME type" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    if (!validateFileSignature(buffer, extension)) {
      return NextResponse.json(
        { success: false, message: "Invalid resume file content" },
        { status: 400 }
      );
    }

    const title =
      typeof titleValue === "string" && titleValue.trim()
        ? titleValue.trim()
        : path.parse(originalName).name;

    if (title.length > 150) {
      return NextResponse.json(
        { success: false, message: "Resume title cannot exceed 150 characters" },
        { status: 400 }
      );
    }

    const isDefault =
      isDefaultValue === "true" || isDefaultValue === "1";

    await mkdir(STORAGE_DIR, { recursive: true });

    const storageKey = `${randomUUID()}${extension}`;
    savedFilePath = path.join(STORAGE_DIR, storageKey);

    await writeFile(savedFilePath, buffer, { flag: "wx" });

    const resume = await prisma.$transaction(async (tx) => {
      if (isDefault) {
        await tx.applicantResume.updateMany({
          where: { userId: user.id, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.applicantResume.create({
        data: {
          userId: user.id,
          title,
          fileName: originalName,
          storageKey,
          mimeType: expectedMimeType,
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
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        message: "Resume uploaded successfully",
        data: resume,
      },
      { status: 201 }
    );
  } catch (error) {
    if (savedFilePath) {
      try {
        await unlink(savedFilePath);
      } catch {
        // Preserve the original error.
      }
    }

    console.error("Resume upload error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to upload resume" },
      { status: 500 }
    );
  }
}


export async function GET(request: NextRequest) {
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
        {
          success: false,
          message: "Only applicants can access their resumes",
        },
        { status: 403 }
      );
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
        { isDefault: "desc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json({
      success: true,
      count: resumes.length,
      data: resumes,
    });
  } catch (error) {
    console.error("Get resumes error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch resumes",
      },
      { status: 500 }
    );
  }
}
