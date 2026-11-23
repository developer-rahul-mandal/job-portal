import { NextRequest, NextResponse } from "next/server";
import { createHmac, randomInt, randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";
import { sendOtpEmail } from "@/lib/resend";

const OTP_WINDOW_MS = 15 * 60 * 1000;
const OTP_EXPIRY_MS = 10 * 60 * 1000;
const RESEND_COOLDOWN_MS = 60 * 1000;

const IP_LIMIT = 5;
const EMAIL_LIMIT = 3;

function getSecret(): string {
  const secret = process.env.OTP_HASH_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("OTP_HASH_SECRET is missing or too short.");
  }

  return secret;
}

function hmac(value: string): string {
  return createHmac("sha256", getSecret()).update(value).digest("hex");
}

function getClientIp(request: NextRequest): string {
  // Trust forwarded headers only if your hosting proxy sanitizes them.
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return request.headers.get("x-real-ip") || "unknown";
}

async function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const now = new Date();
  const cutoff = new Date(now.getTime() - windowMs);

  await prisma.$executeRaw`
    INSERT INTO OtpRateLimit
      (id, \`key\`, hits, windowStart, updatedAt)
    VALUES
      (${randomUUID()}, ${key}, 1, ${now}, ${now})
    ON DUPLICATE KEY UPDATE
      hits = IF(windowStart <= ${cutoff}, 1, hits + 1),
      windowStart = IF(windowStart <= ${cutoff}, ${now}, windowStart),
      updatedAt = ${now}
  `;

  const record = await prisma.otpRateLimit.findUnique({
    where: { key },
    select: {
      hits: true,
      windowStart: true,
    },
  });

  if (!record) {
    throw new Error("Rate limit record could not be retrieved.");
  }

  return {
    allowed: record.hits <= limit,
    resetAt: new Date(record.windowStart.getTime() + windowMs),
  };
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body.",
        },
        { status: 400 },
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid request body.",
        },
        { status: 400 },
      );
    }

    const data = body as Record<string, unknown>;

    const name = typeof data.name === "string" ? data.name.trim() : "";

    const email =
      typeof data.email === "string" ? data.email.trim().toLowerCase() : "";

    const role = data.role;

    if (name.length < 2 || name.length > 150) {
      return NextResponse.json(
        {
          success: false,
          message: "Name must be between 2 and 150 characters.",
        },
        { status: 400 },
      );
    }

    if (
      !email ||
      email.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    ) {
      return NextResponse.json(
        {
          success: false,
          message: "Please provide a valid email address.",
        },
        { status: 400 },
      );
    }

    if (role !== "APPLICANT" && role !== "RECRUITER") {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid registration role.",
        },
        { status: 400 },
      );
    }

    const clientIp = getClientIp(request);

    const ipKey = hmac(`rate-limit:register:ip:${clientIp}`);
    const emailKey = hmac(`rate-limit:register:email:${email}`);

    const ipLimit = await consumeRateLimit(
      `ip:${ipKey}`,
      IP_LIMIT,
      OTP_WINDOW_MS,
    );

    if (!ipLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "Too many OTP requests. Please try again later.",
          resetAt: ipLimit.resetAt.toISOString(),
        },
        { status: 429 },
      );
    }

    const emailLimit = await consumeRateLimit(
      `email:${emailKey}`,
      EMAIL_LIMIT,
      OTP_WINDOW_MS,
    );

    if (!emailLimit.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "Too many OTP requests. Please try again later.",
          resetAt: emailLimit.resetAt.toISOString(),
        },
        { status: 429 },
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
        { status: 409 },
      );
    }

    const otp = randomInt(100000, 1000000).toString();

    const otpHash = createHmac("sha256", getSecret())
      .update(`otp:REGISTER:${email}:${otp}`)
      .digest("hex");

    const now = new Date();

    // Lock is unique to this email and registration purpose.
    const lockKey = `lock:otp:REGISTER:${hmac(email)}`;

    const reservation = await prisma.$transaction(async (tx) => {
      // Create the lock row if it does not exist.
      await tx.$executeRaw`
        INSERT INTO OtpRateLimit
          (id, \`key\`, hits, windowStart, updatedAt)
        VALUES
          (${randomUUID()}, ${lockKey}, 0, ${now}, ${now})
        ON DUPLICATE KEY UPDATE
          \`key\` = \`key\`
      `;

      // Serialize concurrent requests for this email.
      await tx.$queryRaw<Array<{ key: string }>>`
        SELECT \`key\`
        FROM OtpRateLimit
        WHERE \`key\` = ${lockKey}
        FOR UPDATE
      `;

      const recentOtp = await tx.emailOtp.findFirst({
        where: {
          email,
          purpose: "REGISTER",
          consumedAt: null,
          createdAt: {
            gte: new Date(Date.now() - RESEND_COOLDOWN_MS),
          },
        },
        select: { id: true },
      });

      if (recentOtp) {
        return {
          allowed: false as const,
        };
      }

      await tx.emailOtp.deleteMany({
        where: {
          email,
          purpose: "REGISTER",
          consumedAt: null,
        },
      });

      const otpRecord = await tx.emailOtp.create({
        data: {
          email,
          otpHash,
          purpose: "REGISTER",
          expiresAt: new Date(now.getTime() + OTP_EXPIRY_MS),
        },
        select: { id: true },
      });

      return {
        allowed: true as const,
        otpId: otpRecord.id,
      };
    });

    if (!reservation.allowed) {
      return NextResponse.json(
        {
          success: false,
          message: "Please wait 60 seconds before requesting another OTP.",
        },
        { status: 429 },
      );
    }

    try {
      await sendOtpEmail({
        email,
        otp,
        purpose: "REGISTER",
      });
    } catch (error) {
      await prisma.emailOtp.deleteMany({
        where: {
          id: reservation.otpId,
          consumedAt: null,
        },
      });

      console.error("REGISTER_OTP_EMAIL_ERROR:", error);

      return NextResponse.json(
        {
          success: false,
          message: "Unable to deliver OTP email. Please try again later.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Registration OTP sent successfully.",
        expiresIn: 600,
        resendAfter: 60,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("REGISTER_SEND_OTP_ERROR:", error);

    return NextResponse.json(
      {
        success: false,
        message: "An unexpected error occurred.",
      },
      { status: 500 },
    );
  }
}
