import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";
import { CompanyVerificationStatus } from "@/generated/prisma/client";

export async function GET(request: NextRequest) {
  const auth = await requireAdminApi(request);
  if (!auth.success) return auth.response;

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status")?.toUpperCase();

  const where: { verification?: CompanyVerificationStatus } = {};
  if (
    statusParam &&
    ["UNVERIFIED", "PENDING", "VERIFIED", "REJECTED"].includes(statusParam)
  ) {
    where.verification = statusParam as CompanyVerificationStatus;
  }

  try {
    const companies = await prisma.company.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: {
            jobs: true,
            recruiters: true,
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
      data: companies,
    });
  } catch (err) {
    console.error("ADMIN_COMPANIES_ERROR:", err);
    return NextResponse.json(
      { success: false, message: "Failed to fetch companies." },
      { status: 500 }
    );
  }
}
