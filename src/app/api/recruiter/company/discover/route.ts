import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json(
      { success: false, message: "Authentication required." },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() || "";

  if (q.length < 2) {
    return NextResponse.json({ success: true, data: [] });
  }

  const companies = await prisma.company.findMany({
    where: {
      OR: [
        { name: { contains: q } },
        { normalizedDomain: { contains: q.toLowerCase() } },
        { slug: { contains: q.toLowerCase() } },
      ],
    },
    take: 10,
    select: {
      id: true,
      name: true,
      slug: true,
      logo: true,
      industry: true,
      location: true,
      website: true,
      normalizedDomain: true,
      verification: true,
      recruiters: {
        where: { userId: user.id },
        select: { id: true, status: true, membershipRole: true },
      },
      joinRequests: {
        where: { userId: user.id, status: "PENDING" },
        select: { id: true, status: true, createdAt: true },
      },
    },
  });

  const formatted = companies.map((c) => {
    const userMembership = c.recruiters[0] || null;
    const pendingRequest = c.joinRequests[0] || null;
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      logo: c.logo,
      industry: c.industry,
      location: c.location,
      website: c.website,
      normalizedDomain: c.normalizedDomain,
      verification: c.verification,
      hasActiveMembership: userMembership?.status === "ACTIVE",
      hasPendingMembership: userMembership?.status === "PENDING",
      hasPendingJoinRequest: Boolean(pendingRequest),
    };
  });

  return NextResponse.json({ success: true, data: formatted });
}
