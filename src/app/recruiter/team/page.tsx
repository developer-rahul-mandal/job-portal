import { redirect } from "next/navigation";
import { getRecruiterSession } from "@/lib/auth/recruiter";
import { prisma } from "@/lib/prisma";
import TeamManager from "./team-manager";

export const metadata = {
  title: "Team Management | Recruiter Workspace",
};

export default async function RecruiterTeamPage() {
  const session = await getRecruiterSession();

  if (!session || !session.company) {
    redirect("/recruiter/onboarding");
  }

  const { company, membership, user } = session;

  const [members, invitations, joinRequests] = await Promise.all([
    prisma.companyRecruiter.findMany({
      where: { companyId: company.id },
      orderBy: [{ membershipRole: "asc" }, { createdAt: "asc" }],
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    }),
    prisma.companyInvitation.findMany({
      where: {
        companyId: company.id,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.companyJoinRequest.findMany({
      where: {
        companyId: company.id,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    }),
  ]);

  const serializedMembers = members.map((m) => ({
    id: m.id,
    userId: m.userId,
    membershipRole: m.membershipRole,
    status: m.status,
    verificationStatus: m.verificationStatus,
    createdAt: m.createdAt.toISOString(),
    user: {
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.user.role,
    },
  }));

  const serializedInvitations = invitations.map((inv) => ({
    id: inv.id,
    email: inv.email,
    role: inv.role,
    token: inv.token,
    status: inv.status,
    expiresAt: inv.expiresAt.toISOString(),
    createdAt: inv.createdAt.toISOString(),
  }));

  const serializedJoinRequests = joinRequests.map((req) => ({
    id: req.id,
    userId: req.userId,
    status: req.status,
    notes: req.notes,
    createdAt: req.createdAt.toISOString(),
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
    },
  }));

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
          Recruiting Team
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Manage colleagues who can post jobs and review candidates for {company.name}.
        </p>
      </div>

      <TeamManager
        initialMembers={serializedMembers}
        initialInvitations={serializedInvitations}
        initialJoinRequests={serializedJoinRequests}
        callerUserId={user.id}
        callerMembershipRole={membership?.membershipRole || "RECRUITER"}
      />
    </div>
  );
}
