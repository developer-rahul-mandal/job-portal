
import { createHmac, randomBytes, createHash, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SESSION_DURATION = 7 * 24 * 60 * 60;
const MAX_OTP_ATTEMPTS = 5;

function hashOtp(email: string, otp: string): string {
  const secret = process.env.OTP_HASH_SECRET;

  if (!secret) {
    throw new Error("OTP_HASH_SECRET is not configured.");
  }

  return createHmac("sha256", secret)
    .update(`otp:LOGIN:${email}:${otp}`)
    .digest("hex");
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    const otp = typeof body.otp === "string" ? body.otp.trim() : "";

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { success: false, message: "A valid email is required." },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        { success: false, message: "OTP must be a 6-digit number." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        emailVerifiedAt: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired OTP." },
        { status: 400 }
      );
    }

    const otpRecord = await prisma.emailOtp.findFirst({
      where: {
        email,
        purpose: "LOGIN",
        consumedAt: null,
        expiresAt: { gt: new Date() },
        attempts: { lt: MAX_OTP_ATTEMPTS },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { success: false, message: "Invalid or expired OTP." },
        { status: 400 }
      );
    }

    const submittedHash = hashOtp(email, otp);
    const storedHash = Buffer.from(otpRecord.otpHash, "hex");
    const submittedHashBuffer = Buffer.from(submittedHash, "hex");

    const isValid =
      storedHash.length === submittedHashBuffer.length &&
      timingSafeEqual(storedHash, submittedHashBuffer);

    if (!isValid) {
      await prisma.emailOtp.update({
        where: { id: otpRecord.id },
        data: { attempts: { increment: 1 } },
      });

      return NextResponse.json(
        { success: false, message: "Invalid or expired OTP." },
        { status: 400 }
      );
    }

    const sessionToken = randomBytes(32).toString("hex");
    const tokenHash = hashSessionToken(sessionToken);
    const expiresAt = new Date(Date.now() + SESSION_DURATION * 1000);

    await prisma.$transaction(async (tx) => {
      const consumedOtp = await tx.emailOtp.updateMany({
        where: {
          id: otpRecord.id,
          consumedAt: null,
          expiresAt: { gt: new Date() },
          attempts: { lt: MAX_OTP_ATTEMPTS },
        },
        data: {
          consumedAt: new Date(),
        },
      });

      if (consumedOtp.count !== 1) {
        throw new Error("OTP_ALREADY_USED");
      }

      await tx.session.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });
    });

    const response = NextResponse.json({
      success: true,
      message: "Login successful.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        emailVerifiedAt: user.emailVerifiedAt,
      },
      expiresAt: expiresAt.toISOString(),
    });

    response.cookies.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION,
    });

    return response;
  } catch (error) {
    if (error instanceof Error && error.message === "OTP_ALREADY_USED") {
      return NextResponse.json(
        { success: false, message: "Invalid or expired OTP." },
        { status: 400 }
      );
    }

    console.error("Login verify OTP error:", error);

    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
