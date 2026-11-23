import { redirect } from "next/navigation";
import { getRecruiterSession } from "@/lib/auth/recruiter";
import { prisma } from "@/lib/prisma";
import JobWizard from "./job-wizard";

export const metadata = {
  title: "Post a New Job | Recruiter Workspace",
};

export default async function RecruiterNewJobPage() {
  const session = await getRecruiterSession();

  if (!session || !session.company) {
    redirect("/recruiter/onboarding");
  }

  const categories = await prisma.category.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
    },
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-zinc-100">
          Post a New Opportunity
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Create and publish a job vacancy for {session.company.name}.
        </p>
      </div>

      <JobWizard
        categories={categories}
        company={{
          id: session.company.id,
          name: session.company.name,
          slug: session.company.slug,
        }}
      />
    </div>
  );
}
