import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

function errorResponse(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status },
  );
}

// ======================================================
// GET /api/skills?q=java
// ======================================================

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("q")?.trim() ?? "";

    if (query.length > 100) {
      return errorResponse("Search query is too long.", 400);
    }

    if (query.length < 2) {
      return NextResponse.json({
        success: true,
        message: "Enter at least 2 characters to search skills.",
        data: [],
      });
    }

    const skills = await prisma.skill.findMany({
      where: {
        name: {
          contains: query,
        },
      },
      select: {
        id: true,
        name: true,
      },
      orderBy: {
        name: "asc",
      },
      take: 20,
    });

    return NextResponse.json({
      success: true,
      message: "Skills fetched successfully.",
      data: skills,
    });
  } catch (error) {
    console.error("GET_SKILLS_ERROR:", error);

    return errorResponse("An unexpected error occurred.", 500);
  }
}