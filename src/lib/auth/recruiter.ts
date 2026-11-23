import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getAuthenticatedUser, getServerSession, AuthenticatedUser } from "./session";
import { prisma } from "@/lib/prisma";
import { Company, CompanyRecruiter } from "@/generated/prisma/client";

export type ActiveCompanySummary = {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  verification: string;
  membershipRole: string;
  verificationStatus: string;
};

export type RecruiterContext = {
  user: AuthenticatedUser;
  membership: (CompanyRecruiter & { company: Company }) | null;
  company: Company | null;
  activeCompanies: ActiveCompanySummary[];
};

/**
 * Validates recruiter authorization in React Server Components / server pages.
 * Supports active company cookie and multiple company memberships without mutating global user role.
 */
export async function getRecruiterSession(): Promise<RecruiterContext | null> {
  const user = await getServerSession();
  if (!user) return null;

  const memberships = await prisma.companyRecruiter.findMany({
    where: {
      userId: user.id,
      status: "ACTIVE",
    },
    include: {
      company: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Allow access if user is globally RECRUITER/ADMIN OR has active company memberships
  if (user.role !== "RECRUITER" && user.role !== "ADMIN" && memberships.length === 0) {
    return null;
  }

  let activeCompanyId: string | undefined;
  try {
    const cookieStore = await cookies();
    activeCompanyId = cookieStore.get("active_company_id")?.value;
  } catch {
    // Ignore in contexts where cookies are not available
  }

  const selectedMembership =
    memberships.find((m) => m.companyId === activeCompanyId) ||
    memberships[0] ||
    null;

  return {
    user,
    membership: selectedMembership,
    company: selectedMembership?.company ?? null,
    activeCompanies: memberships.map((m) => ({
      id: m.company.id,
      name: m.company.name,
      slug: m.company.slug,
      logo: m.company.logo,
      verification: m.company.verification,
      membershipRole: m.membershipRole,
      verificationStatus: m.verificationStatus,
    })),
  };
}

/**
 * Validates recruiter authorization in API route handlers.
 * Returns either the authorized context or an error NextResponse ready to return.
 */
export async function requireRecruiterApi(
  request: NextRequest,
  options: {
    requireCompany?: boolean;
    requireOwnerOrAdmin?: boolean;
  } = { requireCompany: true, requireOwnerOrAdmin: false }
): Promise<
  | {
      success: true;
      user: AuthenticatedUser;
      membership: CompanyRecruiter & { company: Company };
      company: Company;
      activeCompanies: ActiveCompanySummary[];
    }
  | { success: false; response: NextResponse }
> {
  const user = await getAuthenticatedUser(request);

  if (!user) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, message: "Authentication required." },
        { status: 401 }
      ),
    };
  }

  const memberships = await prisma.companyRecruiter.findMany({
    where: {
      userId: user.id,
      status: "ACTIVE",
    },
    include: {
      company: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (user.role !== "RECRUITER" && user.role !== "ADMIN" && memberships.length === 0) {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, message: "Recruiter access required." },
        { status: 403 }
      ),
    };
  }

  const activeCompanyId = request.cookies.get("active_company_id")?.value;
  const membership =
    memberships.find((m) => m.companyId === activeCompanyId) ||
    memberships[0] ||
    null;

  if (options.requireCompany && (!membership || !membership.company)) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          message: "No active company membership found. Please complete company onboarding.",
          needsOnboarding: true,
        },
        { status: 403 }
      ),
    };
  }

  if (
    options.requireOwnerOrAdmin &&
    membership &&
    membership.membershipRole !== "OWNER" &&
    membership.membershipRole !== "ADMIN" &&
    user.role !== "ADMIN"
  ) {
    return {
      success: false,
      response: NextResponse.json(
        {
          success: false,
          message: "Company Owner or Administrator permission required.",
        },
        { status: 403 }
      ),
    };
  }

  return {
    success: true,
    user,
    membership: membership as CompanyRecruiter & { company: Company },
    company: membership?.company as Company,
    activeCompanies: memberships.map((m) => ({
      id: m.company.id,
      name: m.company.name,
      slug: m.company.slug,
      logo: m.company.logo,
      verification: m.company.verification,
      membershipRole: m.membershipRole,
      verificationStatus: m.verificationStatus,
    })),
  };
}
