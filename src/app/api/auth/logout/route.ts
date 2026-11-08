
import { NextRequest, NextResponse } from "next/server";
import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const sessionToken = request.cookies.get("session")?.value;

    if (sessionToken) {
      const tokenHash = createHash("sha256")
        .update(sessionToken)
        .digest("hex");

      await prisma.session.updateMany({
        where: {
          tokenHash,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      });
    }

    const response = NextResponse.json(
      {
        success: true,
        message: "Logged out successfully.",
      },
      { status: 200 }
    );

    response.cookies.set("session", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch (error) {
    console.error("AUTH_LOGOUT_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Unable to logout.",
      },
      { status: 500 }
    );
  }
}
