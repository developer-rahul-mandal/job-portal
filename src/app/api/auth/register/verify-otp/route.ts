import {
  createHmac,
  createHash,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const OTP_MAX_ATTEMPTS = 5;
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60;

function getOtpSecret(): string {
  const secret = process.env.OTP_HASH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("OTP_HASH_SECRET is missing or too short.");
  }

  return secret;
}

function hashOtp(email: string, otp: string): string {
  return createHmac("sha256", getOtpSecret())
    .update(`otp:REGISTER:${email}:${otp}`)
    .digest("hex");
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function safeCompareHex(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a, "hex");
  const bBuffer = Buffer.from(b, "hex");

  return (
    aBuffer.length === 32 &&
    bBuffer.length === 32 &&
    timingSafeEqual(aBuffer, bBuffer)
  );
}

function invalidOtpResponse() {
  return NextResponse.json(
    { success: false, message: "Invalid or expired OTP." },
    { status: 400 }
  );
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Invalid request body." },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { success: false, message: "Invalid request body." },
        { status: 400 }
      );
    }

    const data = body as Record<string, unknown>;

    const name =
      typeof data.name === "string" ? data.name.trim() : "";

    const email =
      typeof data.email === "string"
        ? data.email.trim().toLowerCase()
        : "";

    const otp =
      typeof data.otp === "string"
        ? data.otp.trim()
        : "";

    const role = data.role;

    if (name.length < 2 || name.length > 150) {
      return NextResponse.json(
        {
          success: false,
          message: "Name must be between 2 and 150 characters.",
        },
        { status: 400 }
      );
    }

    if (
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
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

    if (role !== "APPLICANT" && role !== "RECRUITER") {
      return NextResponse.json(
        { success: false, message: "Invalid registration role." },
        { status: 400 }
      );
    }

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

    const now = new Date();

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
      return invalidOtpResponse();
    }

    const submittedHash = hashOtp(email, otp);

    if (!safeCompareHex(otpRecord.otpHash, submittedHash)) {
      const updateResult = await prisma.emailOtp.updateMany({
        where: {
          id: otpRecord.id,
          consumedAt: null,
          expiresAt: { gt: new Date() },
          attempts: { lt: OTP_MAX_ATTEMPTS },
        },
        data: {
          attempts: { increment: 1 },
        },
      });

      if (updateResult.count !== 1) {
        return invalidOtpResponse();
      }

      const updatedOtp = await prisma.emailOtp.findUnique({
        where: { id: otpRecord.id },
        select: {
          attempts: true,
          consumedAt: true,
          expiresAt: true,
        },
      });

      if (
        !updatedOtp ||
        updatedOtp.consumedAt ||
        updatedOtp.expiresAt <= new Date()
      ) {
        return invalidOtpResponse();
      }

      const remainingAttempts = Math.max(
        0,
        OTP_MAX_ATTEMPTS - updatedOtp.attempts
      );

      return NextResponse.json(
        {
          success: false,
          message: "Invalid or expired OTP.",
          remainingAttempts,
        },
        { status: 400 }
      );
    }

    const sessionToken = randomBytes(32).toString("hex");
    const tokenHash = hashSessionToken(sessionToken);
    const expiresAt = new Date(
      Date.now() + SESSION_DURATION_SECONDS * 1000
    );

    await prisma.$transaction(async (tx) => {
      const consumedOtp = await tx.emailOtp.updateMany({
        where: {
          id: otpRecord.id,
          consumedAt: null,
          expiresAt: { gt: new Date() },
          attempts: { lt: OTP_MAX_ATTEMPTS },
        },
        data: {
          consumedAt: new Date(),
        },
      });

      if (consumedOtp.count !== 1) {
        throw new Error("OTP_ALREADY_USED");
      }

      const user = await tx.user.create({
        data: {
          name,
          email,
          role,
          emailVerifiedAt: new Date(),
          isActive: true,
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
    });

    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        emailVerifiedAt: true,
      },
    });

    if (!user) {
      throw new Error("USER_CREATION_FAILED");
    }

    const response = NextResponse.json({
      success: true,
      message: "Registration successful.",
      user,
      expiresAt: expiresAt.toISOString(),
    });

    response.cookies.set("session", sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_DURATION_SECONDS,
    });

    return response;
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "OTP_ALREADY_USED"
    ) {
      return invalidOtpResponse();
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "An account with this email already exists.",
        },
        { status: 409 }
      );
    }

    console.error("Register verify OTP error:", error);

    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
