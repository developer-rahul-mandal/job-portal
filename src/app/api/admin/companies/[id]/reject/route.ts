import { NextRequest, NextResponse } from "next/server";
import { requireAdminApi } from "@/lib/auth/admin";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminApi(request);
  if (!auth.success) return auth.response;

  const { user } = auth;
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { success: false, message: "Company ID is required." },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const { reason } = body || {};

  if (!reason || typeof reason !== "string" || !reason.trim()) {
    return NextResponse.json(
      { success: false, message: "Rejection reason is required." },
      { status: 400 }
    );
  }

  const company = await prisma.company.findUnique({
    where: { id },
    select: { id: true, name: true, verification: true },
  });

  if (!company) {
    return NextResponse.json(
      { success: false, message: "Company not found." },
      { status: 404 }
    );
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const comp = await tx.company.update({
        where: { id },
        data: { verification: "REJECTED" },
      });

      await tx.companyVerificationHistory.create({
        data: {
          companyId: id,
          previousStatus: company.verification,
          newStatus: "REJECTED",
          reviewedById: user.id,
          reason: reason.trim().slice(0, 500),
        },
      });

      return comp;
    });

    return NextResponse.json({
      success: true,
      message: `Rejected verification for organization "${company.name}".`,
      data: updated,
    });
  } catch (err) {
    console.error("ADMIN_REJECT_COMPANY_ERROR:", err);
    return NextResponse.json(
      { success: false, message: "Failed to reject company verification." },
      { status: 500 }
    );
  }
}
