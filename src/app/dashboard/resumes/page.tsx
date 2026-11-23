import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import ResumeManager from "./resume-manager";

export const metadata = {
  title: "Candidate Resumes — JobPortal",
};

export default async function ResumesPage() {
  const user = await getServerSession();

  if (!user) {
    redirect("/login?redirect=/dashboard/resumes");
  }

  const resumes = await prisma.applicantResume.findMany({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      title: true,
      fileName: true,
      mimeType: true,
      fileSize: true,
      isDefault: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: [
      {
        isDefault: "desc",
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
          Resumes & Documents
        </h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Upload and manage your CVs, resumes, and primary application files.
        </p>
      </div>

      <ResumeManager initialResumes={resumes} />
    </div>
  );
}
