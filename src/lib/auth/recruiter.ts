import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, getServerSession, AuthenticatedUser } from "./session";
import { prisma } from "@/lib/prisma";
import { Company, CompanyRecruiter } from "@/generated/prisma/client";

export type RecruiterContext = {
  user: AuthenticatedUser;
  membership: (CompanyRecruiter & { company: Company }) | null;
  company: Company | null;
};

/**
 * Validates recruiter authorization in React Server Components / server pages.
 */
export async function getRecruiterSession(): Promise<RecruiterContext | null> {
  const user = await getServerSession();
  if (!user) return null;

  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return null;
  }

  const membership = await prisma.companyRecruiter.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
    },
    include: {
      company: true,
    },
  });

  return {
    user,
    membership,
    company: membership?.company ?? null,
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
  | { success: true; user: AuthenticatedUser; membership: CompanyRecruiter & { company: Company }; company: Company }
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

  if (user.role !== "RECRUITER" && user.role !== "ADMIN") {
    return {
      success: false,
      response: NextResponse.json(
        { success: false, message: "Recruiter access required." },
        { status: 403 }
      ),
    };
  }

  const membership = await prisma.companyRecruiter.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
    },
    include: {
      company: true,
    },
  });

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
  };
}
