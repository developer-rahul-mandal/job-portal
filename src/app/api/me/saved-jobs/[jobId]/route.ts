
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ jobId: string }>;
};

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
        { success: false, message: "Only applicants can remove saved jobs" },
        { status: 403 }
      );
    }

    const { jobId } = await params;

    if (!jobId?.trim()) {
      return NextResponse.json(
        { success: false, message: "Valid jobId is required" },
        { status: 400 }
      );
    }

    const savedJob = await prisma.savedJob.findUnique({
      where: {
        userId_jobId: {
          userId: user.id,
          jobId: jobId.trim(),
        },
      },
      select: {
        id: true,
      },
    });

    if (!savedJob) {
      return NextResponse.json(
        { success: false, message: "Saved job not found" },
        { status: 404 }
      );
    }

    await prisma.savedJob.delete({
      where: {
        id: savedJob.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Job removed from saved jobs",
    });
  } catch (error) {
    console.error("Delete saved job error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to remove saved job" },
      { status: 500 }
    );
  }
}