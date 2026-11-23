import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import SkillsManager from "./skills-manager";

export const metadata = {
  title: "Candidate Skills — JobPortal",
};

export default async function SkillsPage() {
  const user = await getServerSession();

  if (!user) {
    redirect("/login?redirect=/dashboard/profile/skills");
  }

  const [skills, suggestions] = await Promise.all([
    prisma.applicantSkill.findMany({
      where: {
        userId: user.id,
      },
      select: {
        skillId: true,
        createdAt: true,
        skill: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.skillSuggestion.findMany({
      where: {
        suggestedBy: user.id,
      },
      select: {
        id: true,
        name: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Skills & Competencies
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Add skills to match your profile with relevant recruiter searches and job postings.
        </p>
      </div>

      <SkillsManager
        initialSkills={skills}
        initialSuggestions={suggestions}
      />
    </div>
  );
}
