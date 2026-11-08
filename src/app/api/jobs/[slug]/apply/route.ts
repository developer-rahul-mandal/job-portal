
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";

function isPrismaUniqueConstraintError(
  error: unknown,
): error is { code: "P2002" } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P2002"
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    // 1. Authenticate user using the existing session cookie.
    const sessionToken = request.cookies.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required.",
        },
        { status: 401 },
      );
    }

    const tokenHash = createHash("sha256")
      .update(sessionToken)
      .digest("hex");

    const session = await prisma.session.findUnique({
      where: { tokenHash },
      select: {
        expiresAt: true,
        revokedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
          },
        },
      },
    });

    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      !session.user.isActive
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired session.",
        },
        { status: 401 },
      );
    }

    // 2. Validate request body.
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      !("resumeUrl" in body) ||
      typeof body.resumeUrl !== "string"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "A valid resume URL is required.",
        },
        { status: 400 },
      );
    }

    const resumeUrl = body.resumeUrl.trim();

    let parsedResumeUrl: URL;

    try {
      parsedResumeUrl = new URL(resumeUrl);
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid resume URL.",
        },
        { status: 400 },
      );
    }

    if (
      !["http:", "https:"].includes(parsedResumeUrl.protocol) ||
      resumeUrl.length > 1000
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid resume URL.",
        },
        { status: 400 },
      );
    }

    const coverLetter =
      "coverLetter" in body &&
      typeof body.coverLetter === "string"
        ? body.coverLetter.trim()
        : null;

    if (coverLetter && coverLetter.length > 10000) {
      return NextResponse.json(
        {
          success: false,
          message: "Cover letter is too long.",
        },
        { status: 400 },
      );
    }

    // 3. Find job by slug.
    const { slug } = await params;

    if (!slug?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Job slug is required.",
        },
        { status: 400 },
      );
    }

    const job = await prisma.job.findUnique({
      where: { slug },
      select: {
        id: true,
        status: true,
        applicationMethod: true,
        deadline: true,
      },
    });

    if (!job || job.status !== "PUBLISHED") {
      return NextResponse.json(
        {
          success: false,
          message: "Job is not available for applications.",
        },
        { status: 404 },
      );
    }

    if (
      job.deadline &&
      job.deadline <= new Date()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Application deadline has passed.",
        },
        { status: 400 },
      );
    }

    if (job.applicationMethod !== "INTERNAL") {
      return NextResponse.json(
        {
          success: false,
          message: "This job does not accept internal applications.",
        },
        { status: 400 },
      );
    }

    // 4. Create application and update application count.
    const applicantName =
      session.user.name?.trim() ||
      session.user.email.split("@")[0];

    const application = await prisma.$transaction(
      async (tx) => {
        const createdApplication =
          await tx.application.create({
            data: {
              jobId: job.id,
              userId: session.user.id,
              applicantName,
              applicantEmail: session.user.email,
              resumeUrl,
              coverLetter,
            },
            select: {
              id: true,
              jobId: true,
              userId: true,
              status: true,
              createdAt: true,
            },
          });

        await tx.job.update({
          where: { id: job.id },
          data: {
            applicationCount: {
              increment: 1,
            },
          },
        });

        return createdApplication;
      },
    );

    return NextResponse.json(
      {
        success: true,
        message: "Application submitted successfully.",
        data: application,
      },
      { status: 201 },
    );
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return NextResponse.json(
        {
          success: false,
          message: "You have already applied for this job.",
        },
        { status: 409 },
      );
    }

    console.error("POST /api/jobs/[slug]/apply error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to submit application.",
      },
      { status: 500 },
    );
  }
}
