
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { unlink } from "node:fs/promises";
import path from "node:path";

const STORAGE_DIR = path.resolve(
  process.env.RESUME_STORAGE_PATH || "./private/resumes"
);

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
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
        { success: false, message: "Only applicants can manage resumes" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const { title, isDefault } = body;

    if (title === undefined && isDefault === undefined) {
      return NextResponse.json(
        { success: false, message: "No fields provided to update" },
        { status: 400 }
      );
    }

    if (
      title !== undefined &&
      (typeof title !== "string" || !title.trim() || title.trim().length > 150)
    ) {
      return NextResponse.json(
        { success: false, message: "Title must be between 1 and 150 characters" },
        { status: 400 }
      );
    }

    if (isDefault !== undefined && typeof isDefault !== "boolean") {
      return NextResponse.json(
        { success: false, message: "isDefault must be a boolean" },
        { status: 400 }
      );
    }

    const existingResume = await prisma.applicantResume.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: { id: true },
    });

    if (!existingResume) {
      return NextResponse.json(
        { success: false, message: "Resume not found" },
        { status: 404 }
      );
    }

    const updatedResume = await prisma.$transaction(async (tx) => {
      if (isDefault === true) {
        await tx.applicantResume.updateMany({
          where: {
            userId: user.id,
            isDefault: true,
          },
          data: { isDefault: false },
        });
      }

      return tx.applicantResume.update({
        where: { id },
        data: {
          ...(title !== undefined ? { title: title.trim() } : {}),
          ...(isDefault !== undefined ? { isDefault } : {}),
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

    return NextResponse.json({
      success: true,
      message: "Resume updated successfully",
      data: updatedResume,
    });
  } catch (error) {
    console.error("Update resume error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to update resume" },
      { status: 500 }
    );
  }
}


export async function DELETE(
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
        { success: false, message: "Only applicants can delete resumes" },
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
        id: true,
        storageKey: true,
        isDefault: true,
      },
    });

    if (!resume) {
      return NextResponse.json(
        { success: false, message: "Resume not found" },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      await tx.applicantResume.delete({
        where: { id: resume.id },
      });

      if (resume.isDefault) {
        const nextResume = await tx.applicantResume.findFirst({
          where: { userId: user.id },
          orderBy: [
            { createdAt: "desc" },
            { id: "desc" },
          ],
          select: { id: true },
        });

        if (nextResume) {
          await tx.applicantResume.update({
            where: { id: nextResume.id },
            data: { isDefault: true },
          });
        }
      }
    });

    const storageKeyPattern = /^[0-9a-f-]{36}\.(pdf|doc|docx)$/i;

    if (!storageKeyPattern.test(resume.storageKey)) {
      console.error("Invalid resume storage key:", resume.id);

      return NextResponse.json({
        success: true,
        message: "Resume deleted, but file cleanup is required",
      });
    }

    const filePath = path.join(STORAGE_DIR, resume.storageKey);

    try {
      await unlink(filePath);
    } catch (error) {
      console.error("Resume file deletion failed:", error);

      return NextResponse.json({
        success: true,
        message: "Resume deleted, but file cleanup is required",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Resume deleted successfully",
    });
  } catch (error) {
    console.error("Delete resume error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to delete resume" },
      { status: 500 }
    );
  }
}

