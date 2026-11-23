import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { companyId } = body || {};

    if (!companyId || typeof companyId !== "string") {
      return NextResponse.json(
        { success: false, message: "companyId is required." },
        { status: 400 }
      );
    }

    // Verify user has an ACTIVE membership in this company (or is global ADMIN)
    const membership = await prisma.companyRecruiter.findFirst({
      where: {
        userId: user.id,
        companyId,
        status: "ACTIVE",
      },
      include: {
        company: true,
      },
    });

    if (!membership && user.role !== "ADMIN") {
      return NextResponse.json(
        { success: false, message: "You do not have active recruiter access to this company." },
        { status: 403 }
      );
    }

    const response = NextResponse.json({
      success: true,
      companyId,
      companyName: membership?.company.name,
    });

    response.cookies.set("active_company_id", companyId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    return response;
  } catch (error) {
    console.error("Company switch error:", error);
    return NextResponse.json(
      { success: false, message: "Failed to switch active company." },
      { status: 500 }
    );
  }
}
