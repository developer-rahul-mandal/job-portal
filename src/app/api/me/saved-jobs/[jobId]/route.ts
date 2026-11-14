import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ jobId: string }>;
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

export async function DELETE(
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

    const { jobId } = await context.params;

    if (!jobId?.trim()) {
      return errorResponse("Valid jobId is required", 400);
    }

    const result = await prisma.savedJob.deleteMany({
      where: {
        userId: user.id,
        jobId: jobId.trim(),
      },
    });

    if (result.count === 0) {
      return errorResponse("Saved job not found", 404);
    }

    return NextResponse.json({
      success: true,
      message: "Saved job removed successfully",
    });
  } catch (error) {
    console.error("DELETE /api/me/saved-jobs/[jobId] error:", error);

    return errorResponse("Failed to remove saved job", 500);
  }
}