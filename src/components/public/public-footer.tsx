import Link from "next/link";

export default function PublicFooter() {
  return (
    <footer className="w-full border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-1 space-y-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 flex items-center justify-center font-bold text-xs">
                JP
              </div>
              <span className="font-bold text-base text-zinc-900 dark:text-zinc-100">
                JobPortal
              </span>
            </Link>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
              Connecting qualified talent with premier technology teams, engineering startups, and global enterprises.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-3">
              Explore
            </h4>
            <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <li>
                <Link href="/jobs" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  All Job Openings
                </Link>
              </li>
              <li>
                <Link href="/companies" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  Top Companies
                </Link>
              </li>
              <li>
                <Link href="/categories" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  Job Categories
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-3">
              For Candidates
            </h4>
            <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <li>
                <Link href="/register" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  Create Candidate Profile
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  Sign In to Dashboard
                </Link>
              </li>
              <li>
                <Link href="/jobs?type=FULL_TIME" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  Full-Time Positions
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider mb-3">
              For Employers
            </h4>
            <ul className="space-y-2 text-xs text-zinc-600 dark:text-zinc-400">
              <li>
                <Link href="/register" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  Register as Recruiter
                </Link>
              </li>
              <li>
                <Link href="/recruiter/dashboard" className="hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  Recruiter Workspace
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 mt-8 border-t border-zinc-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-400">
          <p>&copy; {new Date().getFullYear()} JobPortal. All rights reserved.</p>
          <p>Built with Next.js 16, TypeScript & MariaDB.</p>
        </div>
      </div>
    </footer>
  );
}
