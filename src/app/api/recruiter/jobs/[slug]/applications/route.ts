import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    // 1. Authenticate recruiter
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

    const tokenHash = createHash("sha256").update(sessionToken).digest("hex");

    const session = await prisma.session.findUnique({
      where: { tokenHash },
      select: {
        expiresAt: true,
        revokedAt: true,
        user: {
          select: {
            id: true,
            role: true,
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

    if (session.user.role !== "RECRUITER") {
      return NextResponse.json(
        {
          success: false,
          message: "Recruiter access required.",
        },
        { status: 403 },
      );
    }

    // 2. Get job slug
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

    // 3. Find job
    const job = await prisma.job.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        title: true,
        companyId: true,
        company: {
          select: {
            name: true,
            slug: true,
          },
        },
      },
    });

    if (!job) {
      return NextResponse.json(
        {
          success: false,
          message: "Job not found.",
        },
        { status: 404 },
      );
    }

    // 4. Verify active company membership
    const membership = await prisma.companyRecruiter.findUnique({
      where: {
        userId_companyId: {
          userId: session.user.id,
          companyId: job.companyId,
        },
      },
      select: {
        status: true,
      },
    });

    if (!membership || membership.status !== "ACTIVE") {
      return NextResponse.json(
        {
          success: false,
          message: "You are not authorized to view applicants for this job.",
        },
        { status: 403 },
      );
    }

    // 5. Fetch applications
    const applications = await prisma.application.findMany({
      where: {
        jobId: job.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        applicantName: true,
        applicantEmail: true,
        resumeUrl: true,
        coverLetter: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // 6. Return response
    return NextResponse.json(
      {
        success: true,
        data: {
          job: {
            slug: job.slug,
            title: job.title,
            company: job.company,
          },
          total: applications.length,
          applications,
        },
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "private, no-store",
        },
      },
    );
  } catch (error) {
    console.error("GET /api/recruiter/jobs/[slug]/applications error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch job applications.",
      },
      { status: 500 },
    );
  }
}
