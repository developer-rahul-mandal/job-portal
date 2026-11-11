
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const runtime = "nodejs";

// GET: List applicant's saved jobs
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
        { success: false, message: "Only applicants can access saved jobs" },
        { status: 403 }
      );
    }

    const savedJobs = await prisma.savedJob.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        createdAt: true,
        job: {
          select: {
            id: true,
            slug: true,
            title: true,
            shortDescription: true,
            location: true,
            employmentType: true,
            experienceLevel: true,
            salaryMin: true,
            salaryMax: true,
            salaryCurrency: true,
            salaryPeriod: true,
            status: true,
            publishedAt: true,
            deadline: true,
            company: {
              select: {
                id: true,
                name: true,
                slug: true,
                logo: true,
                location: true,
              },
            },
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      count: savedJobs.length,
      data: savedJobs,
    });
  } catch (error) {
    console.error("Get saved jobs error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to fetch saved jobs" },
      { status: 500 }
    );
  }
}

// POST: Save a job
export async function POST(request: NextRequest) {
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
        { success: false, message: "Only applicants can save jobs" },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => null);

    if (
      !body ||
      typeof body.jobId !== "string" ||
      !body.jobId.trim()
    ) {
      return NextResponse.json(
        { success: false, message: "Valid jobId is required" },
        { status: 400 }
      );
    }

    const jobId = body.jobId.trim();

    const job = await prisma.job.findUnique({
      where: { id: jobId },
      select: {
        id: true,
        status: true,
        publishedAt: true,
        deadline: true,
      },
    });

    if (!job || job.status !== "PUBLISHED") {
      return NextResponse.json(
        { success: false, message: "Job not found or unavailable" },
        { status: 404 }
      );
    }

    const now = new Date();

    if (job.deadline && job.deadline < now) {
      return NextResponse.json(
        { success: false, message: "This job application deadline has passed" },
        { status: 409 }
      );
    }

    const existingSavedJob = await prisma.savedJob.findUnique({
      where: {
        userId_jobId: {
          userId: user.id,
          jobId,
        },
      },
      select: {
        id: true,
        createdAt: true,
      },
    });

    if (existingSavedJob) {
      return NextResponse.json(
        { success: false, message: "Job is already saved" },
        { status: 409 }
      );
    }

    const savedJob = await prisma.savedJob.create({
      data: {
        userId: user.id,
        jobId,
      },
      select: {
        id: true,
        jobId: true,
        createdAt: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "Job saved successfully",
        data: savedJob,
      },
      { status: 201 }
    );
  } catch (error) {
    // Handles duplicate requests that race between lookup and create.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { success: false, message: "Job is already saved" },
        { status: 409 }
      );
    }

    console.error("Save job error:", error);

    return NextResponse.json(
      { success: false, message: "Failed to save job" },
      { status: 500 }
    );
  }
}
