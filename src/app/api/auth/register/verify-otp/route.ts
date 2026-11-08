
import { NextRequest, NextResponse } from "next/server";
import {
  createHmac,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

import { prisma } from "@/lib/prisma";

const OTP_MAX_ATTEMPTS = 5;
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60;

function getOtpSecret() {
  const secret = process.env.OTP_HASH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("OTP_HASH_SECRET is missing or too short.");
  }

  return secret;
}

function hashOtp(email: string, otp: string) {
  return createHmac("sha256", getOtpSecret())
    .update(`otp:REGISTER:${email}:${otp}`)
    .digest("hex");
}

function hashSessionToken(token: string) {
  return createHash("sha256")
    .update(token)
    .digest("hex");
}

function safeCompareHex(a: string, b: string) {
  const bufferA = Buffer.from(a, "hex");
  const bufferB = Buffer.from(b, "hex");

  if (bufferA.length !== bufferB.length) {
    return false;
  }

  return timingSafeEqual(bufferA, bufferB);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const name =
      typeof body.name === "string" ? body.name.trim() : "";

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    const otp =
      typeof body.otp === "string" ? body.otp.trim() : "";

    const role = body.role;

    if (name.length < 2 || name.length > 150) {
      return NextResponse.json(
        {
          success: false,
          message: "Name must be between 2 and 150 characters.",
        },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email) || email.length > 254) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide a valid email address.",
        },
        { status: 400 }
      );
    }

    if (!/^\d{6}$/.test(otp)) {
      return NextResponse.json(
        {
          success: false,
          message: "OTP must be a 6-digit code.",
        },
        { status: 400 }
      );
    }

    if (role !== "APPLICANT" && role !== "RECRUITER") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid registration role.",
        },
        { status: 400 }
      );
    }

    const now = new Date();

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "An account with this email already exists.",
        },
        { status: 409 }
      );
    }

    const otpRecord = await prisma.emailOtp.findFirst({
      where: {
        email,
        purpose: "REGISTER",
        consumedAt: null,
        expiresAt: { gt: now },
        attempts: { lt: OTP_MAX_ATTEMPTS },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return NextResponse.json(
        {
          success: false,
          message: "OTP is invalid, expired, or has reached the maximum attempts.",
        },
        { status: 400 }
      );
    }

    const submittedHash = hashOtp(email, otp);

    if (!safeCompareHex(otpRecord.otpHash, submittedHash)) {
      const attemptUpdate = await prisma.emailOtp.updateMany({
        where: {
          id: otpRecord.id,
          consumedAt: null,
          attempts: { lt: OTP_MAX_ATTEMPTS },
        },
        data: {
          attempts: { increment: 1 },
        },
      });

      return NextResponse.json(
        {
          success: false,
          message:
            attemptUpdate.count === 0
              ? "OTP is invalid, expired, or has reached the maximum attempts."
              : "Invalid OTP.",
          remainingAttempts:
            attemptUpdate.count === 0
              ? 0
              : Math.max(
                  0,
                  OTP_MAX_ATTEMPTS - (otpRecord.attempts + 1)
                ),
        },
        { status: 400 }
      );
    }

    // Create a new random session token.
    const sessionToken = randomBytes(32).toString("hex");
    const tokenHash = hashSessionToken(sessionToken);

    const expiresAt = new Date(
      now.getTime() + SESSION_DURATION_SECONDS * 1000
    );

    const result = await prisma.$transaction(async (tx) => {
      // Atomically consume OTP. Only one request can consume it.
      const consumeResult = await tx.emailOtp.updateMany({
        where: {
          id: otpRecord.id,
          consumedAt: null,
          expiresAt: { gt: now },
          attempts: { lt: OTP_MAX_ATTEMPTS },
        },
        data: {
          consumedAt: now,
        },
      });

      if (consumeResult.count !== 1) {
        return { success: false as const };
      }

      const user = await tx.user.create({
        data: {
          name,
          email,
          role,
          emailVerifiedAt: now,
          isActive: true,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          emailVerifiedAt: true,
        },
      });

      await tx.authAccount.create({
        data: {
          userId: user.id,
          provider: "EMAIL_OTP",
          providerAccountId: email,
        },
      });

      await tx.session.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      return {
        success: true as const,
        user,
      };
    });

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: "OTP has already been used or expired. Please request a new OTP.",
        },
        { status: 400 }
      );
    }

    const response = NextResponse.json(
      {
        success: true,
        message: "Registration successful.",
        user: result.user,
      },
      { status: 201 }
    );

    response.cookies.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    });

    return response;
  } catch (error) {
    console.error("REGISTER_VERIFY_OTP_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred.",
      },
      { status: 500 }
    );
  }
}
