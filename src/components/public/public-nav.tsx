"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/auth/logout-button";
import ThemeToggle from "@/components/theme/theme-toggle";
import { getDefaultDashboardPath } from "@/lib/auth/redirects";

type PublicNavProps = {
  user?: {
    id: string;
    email: string;
    role: "APPLICANT" | "RECRUITER" | "ADMIN";
    name?: string | null;
  } | null;
};

export default function PublicNav({ user }: PublicNavProps) {
  const pathname = usePathname();

  const navLinks = [
    { href: "/jobs", label: "Find Jobs" },
    { href: "/companies", label: "Companies" },
    { href: "/categories", label: "Categories" },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Brand & Left Links */}
        <div className="flex items-center gap-6 sm:gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="h-8 w-8 rounded-lg bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-sm tracking-tight shadow-sm">
              JP
            </div>
            <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100">
              JobPortal
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 font-semibold"
                      : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              <span className="hidden lg:inline text-xs text-zinc-500 dark:text-zinc-400">
                Signed in as <strong className="text-zinc-800 dark:text-zinc-200">{user.name || user.email}</strong>
              </span>
              <Link
                href={getDefaultDashboardPath(user.role)}
                className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm"
              >
                Dashboard
              </Link>
              <LogoutButton />
            </div>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">
              <Link
                href="/login"
                className="px-3 py-1.5 text-xs sm:text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm"
              >
                Create account
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Secondary Nav Bar */}
      <div className="md:hidden flex items-center justify-around border-t border-zinc-200 dark:border-zinc-800 py-2 bg-zinc-50 dark:bg-zinc-900/50 text-xs font-medium">
        {navLinks.map((link) => {
          const isActive = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`px-3 py-1 rounded-md ${
                isActive
                  ? "text-zinc-900 dark:text-zinc-100 font-bold bg-zinc-200/60 dark:bg-zinc-800"
                  : "text-zinc-600 dark:text-zinc-400"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
