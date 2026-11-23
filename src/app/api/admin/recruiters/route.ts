import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { RecruiterVerificationStatus } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if (!auth.success) return auth.response;

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status")?.toUpperCase();

  const where: { verificationStatus?: RecruiterVerificationStatus } = {};
  if (
    statusParam &&
    ["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"].includes(statusParam)
  ) {
    where.verificationStatus = statusParam as RecruiterVerificationStatus;
  }

  try {
    const recruiters = await prisma.companyRecruiter.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            verification: true,
          },
        },
        verificationHistory: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
    });

    return NextResponse.json({
      success: true,
      data: recruiters,
    });
  } catch (err) {
    console.error("ADMIN_RECRUITERS_ERROR:", err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch recruiters." },
      { status: 500 }
    );
  }
}
