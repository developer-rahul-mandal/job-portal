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

  const members = await prisma.companyRecruiter.findMany({
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
  });

  const serializedMembers = members.map((m) => ({
    id: m.id,
    userId: m.userId,
    membershipRole: m.membershipRole,
    status: m.status,
    createdAt: m.createdAt.toISOString(),
    user: {
      id: m.user.id,
      name: m.user.name,
      email: m.user.email,
      role: m.user.role,
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
        callerUserId={user.id}
        callerMembershipRole={membership?.membershipRole || "RECRUITER"}
      />
    </div>
  );
}
