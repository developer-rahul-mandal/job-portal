
import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import { rename, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";

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

export async function PATCH(
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

    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body)
    ) {
      return errorResponse("Invalid request body", 400);
    }

    const input = body as Record<string, unknown>;

    const allowedFields = ["title", "isDefault"];

    if (Object.keys(input).some((key) => !allowedFields.includes(key))) {
      return errorResponse("Unsupported field provided", 400);
    }

    if (Object.keys(input).length === 0) {
      return errorResponse("No fields provided for update", 400);
    }

    const data: {
      title?: string;
      isDefault?: boolean;
    } = {};

    if ("title" in input) {
      if (
        typeof input.title !== "string" ||
        !input.title.trim() ||
        input.title.trim().length > 150
      ) {
        return errorResponse("Invalid resume title", 400);
      }

      data.title = input.title.trim();
    }

    if ("isDefault" in input) {
      if (typeof input.isDefault !== "boolean") {
        return errorResponse("isDefault must be a boolean", 400);
      }

      data.isDefault = input.isDefault;
    }

    const existing = await prisma.applicantResume.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
      },
    });

    if (!existing) {
      return errorResponse("Resume not found", 404);
    }

    const resume = await prisma.$transaction(async (tx) => {
      if (data.isDefault === true) {
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

      return tx.applicantResume.update({
        where: {
          id: existing.id,
        },
        data,
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
      data: resume,
    });
  } catch (error) {
    console.error("PATCH /api/me/resumes/[id] error:", error);

    return errorResponse("Failed to update resume", 500);
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  let originalPath: string | null = null;
  let stagedPath: string | null = null;

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

    const existing = await prisma.applicantResume.findFirst({
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

    if (!existing) {
      return errorResponse("Resume not found", 404);
    }

    originalPath = getResumeFilePath(existing.storageKey);

    stagedPath = path.join(
      path.dirname(originalPath),
      `.deleting-${randomUUID()}`
    );

    // Stage the physical file before deleting its database record.
    await rename(originalPath, stagedPath);

    try {
      await prisma.$transaction(async (tx) => {
        await tx.applicantResume.delete({
          where: {
            id: existing.id,
          },
        });

        if (existing.isDefault) {
          const nextResume = await tx.applicantResume.findFirst({
            where: {
              userId: user.id,
            },
            orderBy: [
              {
                createdAt: "desc",
              },
              {
                id: "desc",
              },
            ],
            select: {
              id: true,
            },
          });

          if (nextResume) {
            await tx.applicantResume.update({
              where: {
                id: nextResume.id,
              },
              data: {
                isDefault: true,
              },
            });
          }
        }
      });
    } catch (databaseError) {
      // Restore the file if the database transaction fails.
      try {
        await rename(stagedPath, originalPath);
        stagedPath = null;
      } catch (restoreError) {
        console.error("Resume file restoration failed:", restoreError);
      }

      throw databaseError;
    }

    // The database record is deleted. Remove the staged file.
    try {
      await unlink(stagedPath);
      stagedPath = null;
    } catch (cleanupError) {
      console.error("Resume staged-file cleanup failed:", cleanupError);
    }

    return NextResponse.json({
      success: true,
      message: "Resume deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/me/resumes/[id] error:", error);

    return errorResponse("Failed to delete resume", 500);
  }
}
