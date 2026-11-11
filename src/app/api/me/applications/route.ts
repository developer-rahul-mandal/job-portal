
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/auth/session";

export const runtime = "nodejs";

// GET: List applicant's applications
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
          message: "Only applicants can access their applications",
        },
        { status: 403 }
      );
    }

    const applications = await prisma.application.findMany({
      where: {
        userId: user.id,
      },
      select: {
        id: true,
        status: true,
        applicantName: true,
        applicantEmail: true,
        coverLetter: true,
        createdAt: true,
        updatedAt: true,

        resume: {
          select: {
            id: true,
            title: true,
            fileName: true,
            mimeType: true,
            fileSize: true,
          },
        },

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
      count: applications.length,
      data: applications,
    });
  } catch (error) {
    console.error("Get applications error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to fetch applications",
      },
      { status: 500 }
    );
  }
}
