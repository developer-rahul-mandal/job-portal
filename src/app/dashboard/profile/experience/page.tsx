import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import ExperienceManager from "./experience-manager";

export const metadata = {
  title: "Candidate Experience — JobPortal",
};

export default async function ExperiencePage() {
  const user = await getServerSession();

  if (!user) {
    redirect("/login?redirect=/dashboard/profile/experience");
  }

  const experience = await prisma.applicantExperience.findMany({
    where: {
      userId: user.id,
    },
    orderBy: [
      {
        startDate: "desc",
      },
      {
        createdAt: "desc",
      },
    ],
  });

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Work Experience
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Manage your current and past employment roles and accomplishments.
        </p>
      </div>

      <ExperienceManager initialExperience={experience} />
    </div>
  );
}
