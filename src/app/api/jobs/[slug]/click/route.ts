import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

// In-memory sliding-window rate limiter for external click tracking
// Maps "ip:slug" -> { count: number, resetAt: number }
const clickRateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_CLICKS_PER_WINDOW = 30; // Max 30 clicks
const WINDOW_DURATION_MS = 60 * 1000; // 1 minute window

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const entry = clickRateLimitMap.get(key);

  if (!entry || entry.resetAt < now) {
    clickRateLimitMap.set(key, { count: 1, resetAt: now + WINDOW_DURATION_MS });
    return false;
  }

  if (entry.count >= MAX_CLICKS_PER_WINDOW) {
    return true;
  }

  entry.count += 1;
  return false;
}

// Periodically purge expired rate limit entries to prevent memory leaks
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of clickRateLimitMap.entries()) {
      if (entry.resetAt < now) {
        clickRateLimitMap.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

function isValidExternalUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const { slug } = await context.params;

    if (!slug?.trim()) {
      return NextResponse.json(
        { success: false, message: "Job slug is required." },
        { status: 400 }
      );
    }

    // Rate limiting check
    const forwarded = request.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "anonymous";
    const rateLimitKey = `${ip}:${slug}`;

    if (isRateLimited(rateLimitKey)) {
      return NextResponse.json(
        { success: false, message: "Too many apply requests. Please try again shortly." },
        { status: 429 }
      );
    }

    const job = await prisma.job.findUnique({
      where: { slug: slug.trim() },
      select: {
        id: true,
        status: true,
        applicationMethod: true,
        applicationUrl: true,
        deadline: true,
        applyClickCount: true,
      },
    });

    if (!job || job.status !== "PUBLISHED") {
      return NextResponse.json(
        { success: false, message: "Job not found or no longer available." },
        { status: 404 }
      );
    }

    if (job.deadline && job.deadline <= new Date()) {
      return NextResponse.json(
        { success: false, message: "Application deadline for this job has passed." },
        { status: 400 }
      );
    }

    if (job.applicationMethod !== "EXTERNAL") {
      return NextResponse.json(
        {
          success: false,
          message: "This job does not accept external applications.",
          applicationMethod: job.applicationMethod,
        },
        { status: 400 }
      );
    }

    if (!job.applicationUrl || !isValidExternalUrl(job.applicationUrl)) {
      return NextResponse.json(
        { success: false, message: "External application URL is missing or invalid." },
        { status: 400 }
      );
    }

    // Safely increment applyClickCount atomically
    const updated = await prisma.job.update({
      where: { id: job.id },
      data: {
        applyClickCount: {
          increment: 1,
        },
      },
      select: {
        applyClickCount: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        message: "External apply click recorded.",
        data: {
          applyClickCount: updated.applyClickCount,
          applicationUrl: job.applicationUrl,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/jobs/[slug]/click error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error." },
      { status: 500 }
    );
  }
}
