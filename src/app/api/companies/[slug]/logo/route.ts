import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  isSafeLogoKey,
  readLogoFromDisk,
  getImageMimeType,
} from "@/lib/company-logo-storage";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    if (!slug) {
      return NextResponse.json({ success: false, message: "Slug required." }, { status: 400 });
    }

    const company = await prisma.company.findUnique({
      where: { slug },
      select: { logo: true },
    });

    if (!company?.logo) {
      return NextResponse.json({ success: false, message: "Logo not found." }, { status: 404 });
    }

    // If external URL, redirect
    if (company.logo.startsWith("http://") || company.logo.startsWith("https://")) {
      return NextResponse.redirect(company.logo, { status: 307 });
    }

    if (!isSafeLogoKey(company.logo)) {
      return NextResponse.json({ success: false, message: "Invalid logo key." }, { status: 404 });
    }

    const etag = `"${company.logo}"`;
    if (request.headers.get("if-none-match") === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag } });
    }

    try {
      const buffer = await readLogoFromDisk(company.logo);
      const ext = company.logo.split(".").pop() || "jpg";
      const mime = getImageMimeType(ext);

      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": mime,
          "Cache-Control": "public, max-age=3600, must-revalidate",
          ETag: etag,
          "X-Content-Type-Options": "nosniff",
        },
      });
    } catch {
      return NextResponse.json({ success: false, message: "Logo file missing." }, { status: 404 });
    }
  } catch (err) {
    console.error("GET_COMPANY_LOGO_ERROR:", err);
    return NextResponse.json({ success: false, message: "Internal error." }, { status: 500 });
  }
}
