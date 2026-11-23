import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { getRecruiterSession } from "@/lib/auth/recruiter";
import RecruiterNav from "@/components/recruiter/recruiter-nav";
import LogoutButton from "@/components/auth/logout-button";
import ThemeToggle from "@/components/theme/theme-toggle";

export default async function RecruiterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerSession();

  if (!user) {
    redirect("/login?redirect=/recruiter/dashboard");
  }

  const recruiterContext = await getRecruiterSession();

  // If user has no active company membership and is not ADMIN, show onboarding experience
  if (!recruiterContext?.membership || !recruiterContext.company) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col">
        {/* Simple Onboarding Topbar */}
        <header className="px-6 py-4 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-base text-zinc-900 dark:text-zinc-100">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
              JP
            </div>
            JobPortal Recruiter Onboarding
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle variant="dropdown" />
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    );
  }

  const { membership, company, activeCompanies } = recruiterContext;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex flex-col lg:flex-row">
      <RecruiterNav
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }}
        company={{
          id: company.id,
          name: company.name,
          slug: company.slug,
          logo: company.logo,
          verification: company.verification,
        }}
        membershipRole={membership.membershipRole}
        activeCompanies={activeCompanies}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar with user info, theme toggle & logout */}
        <header className="lg:hidden px-4 py-3 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-zinc-500">{company.name}</p>
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {user.name || user.email}
            </p>
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
