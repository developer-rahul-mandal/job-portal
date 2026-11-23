import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import ProfileForm from "./profile-form";

export const metadata = {
  title: "Candidate Profile — JobPortal",
};

export default async function ProfilePage() {
  const user = await getServerSession();

  if (!user) {
    redirect("/login?redirect=/dashboard/profile");
  }

  const profile = await prisma.userProfile.findUnique({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      phone: true,
      headline: true,
      bio: true,
      location: true,
      profileImage: true,
      socials: true,
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-zinc-200 dark:border-zinc-800 gap-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Edit Profile
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Keep your personal details, professional headline, and links up to date.
          </p>
        </div>
      </div>

      <ProfileForm
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
        }}
        initialProfile={profile}
      />
    </div>
  );
}
