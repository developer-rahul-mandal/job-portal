"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "@/components/auth/logout-button";
import ThemeToggle from "@/components/theme/theme-toggle";

type CompanyItem = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  verification: string;
  membershipRole?: string;
  verificationStatus?: string;
};

type RecruiterNavProps = {
  user: {
    id: string;
    name?: string | null;
    email: string;
    role: string;
  };
  company: {
    id: string;
    name: string;
    slug: string;
    logo?: string | null;
    verification: string;
  };
  membershipRole: string;
  activeCompanies?: CompanyItem[];
};

const navItems = [
  {
    href: "/recruiter/dashboard",
    label: "Dashboard",
    exact: true,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
      </svg>
    ),
  },
  {
    href: "/recruiter/jobs",
    label: "Job Postings",
    exact: true,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
      </svg>
    ),
  },
  {
    href: "/recruiter/jobs/new",
    label: "Post a Job",
    exact: false,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
    ),
  },
  {
    href: "/recruiter/company",
    label: "Company Profile",
    exact: false,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
      </svg>
    ),
  },
  {
    href: "/recruiter/team",
    label: "Team Members",
    exact: false,
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
      </svg>
    ),
  },
];

export default function RecruiterNav({
  user,
  company,
  membershipRole,
  activeCompanies = [],
}: RecruiterNavProps) {
  const pathname = usePathname();
  const [switching, setSwitching] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const isLinkActive = (item: (typeof navItems)[number]) => {
    if (item.exact) {
      return pathname === item.href;
    }
    return pathname.startsWith(item.href);
  };

  const handleSwitchCompany = async (targetCompanyId: string) => {
    if (targetCompanyId === company.id || switching) return;
    setSwitching(true);
    try {
      const res = await fetch("/api/recruiter/company/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId: targetCompanyId }),
      });
      if (res.ok) {
        window.location.reload();
      } else {
        alert("Could not switch company.");
      }
    } catch {
      alert("Network error switching company.");
    } finally {
      setSwitching(false);
      setDropdownOpen(false);
    }
  };

  return (
    <aside className="w-full lg:w-64 flex-shrink-0 bg-white dark:bg-zinc-900 border-b lg:border-b-0 lg:border-r border-zinc-200 dark:border-zinc-800 flex flex-col justify-between">
      <div>
        {/* Workspace Brand / Header with Company Switcher */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 relative">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm shrink-0">
                {company.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={company.logo}
                    alt={company.name}
                    className="w-full h-full object-cover rounded-xl"
                  />
                ) : (
                  company.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-zinc-900 dark:text-zinc-100 text-sm truncate block">
                    {company.name}
                  </span>
                  {activeCompanies.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setDropdownOpen(!dropdownOpen)}
                      className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded transition"
                      title="Switch company"
                    >
                      <svg
                        className={`w-3.5 h-3.5 transition-transform ${dropdownOpen ? "rotate-180" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-[10px] uppercase font-semibold px-1.5 py-0.2 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                    {membershipRole}
                  </span>
                  {company.verification === "VERIFIED" ? (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                      ✓ Verified
                    </span>
                  ) : (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                      Unverified
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="lg:hidden shrink-0">
              <ThemeToggle variant="dropdown" />
            </div>
          </div>

          {/* Company Switcher Dropdown */}
          {dropdownOpen && activeCompanies.length > 1 && (
            <div className="absolute left-4 right-4 top-full mt-1 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-lg z-50 p-2 space-y-1">
              <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold px-2 py-1">
                Switch Organization
              </p>
              {activeCompanies.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  disabled={switching || c.id === company.id}
                  onClick={() => handleSwitchCompany(c.id)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition ${
                    c.id === company.id
                      ? "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 font-semibold cursor-default"
                      : "text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/60"
                  }`}
                >
                  <span className="truncate">{c.name}</span>
                  {c.id === company.id && (
                    <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold ml-2">Active</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="p-3 sm:p-4 space-y-1 overflow-x-auto flex lg:flex-col gap-1 lg:gap-1.5 no-scrollbar">
          {navItems.map((item) => {
            const active = isLinkActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-semibold shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                }`}
              >
                <span className={active ? "text-blue-600 dark:text-blue-400" : "text-zinc-400 dark:text-zinc-500"}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Recruiter Identity, Appearance & Logout at Bottom */}
      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 mt-auto hidden lg:block space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Appearance</span>
          <ThemeToggle />
        </div>

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {user.name || "Recruiter"}
            </p>
            <p className="text-[11px] text-zinc-500 truncate">{user.email}</p>
          </div>
          <LogoutButton />
        </div>
      </div>
    </aside>
  );
}
