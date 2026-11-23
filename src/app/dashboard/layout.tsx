import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import DashboardNav from "@/components/dashboard/dashboard-nav";
import LogoutButton from "@/components/auth/logout-button";
import ThemeToggle from "@/components/theme/theme-toggle";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerSession();

  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  if (user.role === "RECRUITER") {
    redirect("/recruiter/dashboard");
  }

  if (user.role === "ADMIN") {
    redirect("/admin");
  }

  const profile = await prisma.userProfile.findUnique({
    where: { userId: user.id },
    select: { profileImage: true },
  });

  const hasAvatar = Boolean(profile?.profileImage);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col lg:flex-row">
      <DashboardNav
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          hasAvatar,
        }}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar with user info, theme toggle & logout */}
        <header className="lg:hidden px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-600 dark:text-zinc-300 overflow-hidden shrink-0">
              {hasAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/api/me/profile/avatar"
                  alt={user.name || "Candidate"}
                  className="w-full h-full object-cover"
                />
              ) : (
                (user.name || user.email).charAt(0).toUpperCase()
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-zinc-500">Signed in as</p>
              <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {user.name || user.email}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle variant="dropdown" />
            <LogoutButton />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
