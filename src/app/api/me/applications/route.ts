
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    // 1. Read session cookie
    const sessionToken = request.cookies.get("session")?.value;

    if (!sessionToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Authentication required.",
        },
        { status: 401 }
      );
    }

    // 2. Hash session token
    const tokenHash = createHash("sha256")
      .update(sessionToken)
      .digest("hex");

    // 3. Validate session
    const session = await prisma.session.findUnique({
      where: { tokenHash },
      select: {
        expiresAt: true,
        revokedAt: true,
        user: {
          select: {
            id: true,
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
        { status: 401 }
      );
    }

    // 4. Fetch authenticated user's applications
    const applications = await prisma.application.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        status: true,
        applicantName: true,
        applicantEmail: true,
        resumeUrl: true,
        coverLetter: true,
        createdAt: true,
        updatedAt: true,

        job: {
          select: {
            id: true,
            slug: true,
            title: true,
            role: true,
            location: true,
            employmentType: true,
            experienceLevel: true,
            salaryMin: true,
            salaryMax: true,
            salaryCurrency: true,
            salaryPeriod: true,
            status: true,

            company: {
              select: {
                name: true,
                slug: true,
                logo: true,
              },
            },
          },
        },
      },
    });

    // 5. Return applications
    return NextResponse.json(
      {
        success: true,
        message: "Applications fetched successfully.",
        data: {
          total: applications.length,
          applications,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("MY_APPLICATIONS_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred.",
      },
      { status: 500 }
    );
  }
}
