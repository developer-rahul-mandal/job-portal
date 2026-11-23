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
    const { companyId, notes } = body || {};

    if (!companyId || typeof companyId !== "string") {
      return NextResponse.json(
        { success: false, message: "companyId is required." },
        { status: 400 }
      );
    }

    const company = await prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true },
    });

    if (!company) {
      return NextResponse.json(
        { success: false, message: "Company not found." },
        { status: 404 }
      );
    }

    // Check if user is already an active or pending member
    const existingMembership = await prisma.companyRecruiter.findUnique({
      where: {
        userId_companyId: {
          userId: user.id,
          companyId,
        },
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        {
          success: false,
          message:
            existingMembership.status === "ACTIVE"
              ? `You are already an active member of ${company.name}.`
              : `You already have a membership record (${existingMembership.status}) with ${company.name}.`,
        },
        { status: 400 }
      );
    }

    // Check if user already has a pending join request
    const existingRequest = await prisma.companyJoinRequest.findFirst({
      where: {
        companyId,
        userId: user.id,
        status: "PENDING",
      },
    });

    if (existingRequest) {
      return NextResponse.json(
        {
          success: false,
          message: `You already have a pending request to join ${company.name}. Please await company approval.`,
        },
        { status: 400 }
      );
    }

    // Create join request
    const joinRequest = await prisma.companyJoinRequest.create({
      data: {
        companyId,
        userId: user.id,
        status: "PENDING",
        notes: typeof notes === "string" && notes.trim() ? notes.trim().slice(0, 500) : null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: `Your request to join ${company.name} has been submitted for review.`,
        data: joinRequest,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST_COMPANY_JOIN_REQUEST_ERROR:", error);
    return NextResponse.json(
      { success: false, message: "Failed to submit company join request." },
      { status: 500 }
    );
  }
}
