"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface ApplicationItem {
  id: string;
  status: string;
  coverLetter: string | null;
  resumeFileName: string | null;
  resumeFileSize: number | null;
  resumeStorageKey: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profileSnapshot: any;
  createdAt: string;
  updatedAt: string;
  job: {
    id: string;
    slug: string;
    title: string;
    shortDescription?: string | null;
    location: string;
    salaryMin?: number | null;
    salaryMax?: number | null;
    salaryCurrency?: string | null;
    employmentType: string;
    company: {
      id: string;
      name: string;
      slug: string;
      logo?: string | null;
      verification: string;
    };
    category?: {
      id: string;
      name: string;
      slug: string;
    } | null;
  };
  statusHistory: {
    id: string;
    previousStatus?: string | null;
    newStatus: string;
    reason?: string | null;
    createdAt: string;
  }[];
}

interface ApplicationsManagerProps {
  initialApplications: ApplicationItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  currentStatus: string;
  currentQuery: string;
}

const statusTabs = [
  { label: "All Applications", value: "" },
  { label: "Submitted", value: "SUBMITTED" },
  { label: "Under Review", value: "UNDER_REVIEW" },
  { label: "Shortlisted", value: "SHORTLISTED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Hired", value: "HIRED" },
  { label: "Withdrawn", value: "WITHDRAWN" },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "SUBMITTED":
      return {
        label: "Submitted",
        className: "bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
      };
    case "UNDER_REVIEW":
      return {
        label: "Under Review",
        className: "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
      };
    case "SHORTLISTED":
      return {
        label: "Shortlisted",
        className: "bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
      };
    case "HIRED":
      return {
        label: "Hired",
        className: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
      };
    case "REJECTED":
      return {
        label: "Not Selected",
        className: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
      };
    case "WITHDRAWN":
      return {
        label: "Withdrawn",
        className: "bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
      };
    default:
      return {
        label: status,
        className: "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
      };
  }
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ApplicationsManager({
  initialApplications,
  pagination,
  currentStatus,
  currentQuery,
}: ApplicationsManagerProps) {
  const router = useRouter();
  const [search, setSearch] = useState(currentQuery);
  const [selectedAppForSnapshot, setSelectedAppForSnapshot] = useState<ApplicationItem | null>(null);
  const [selectedAppForWithdraw, setSelectedAppForWithdraw] = useState<ApplicationItem | null>(null);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);

  function handleFilter(statusValue: string) {
    const params = new URLSearchParams();
    if (statusValue) params.set("status", statusValue);
    if (search.trim()) params.set("q", search.trim());
    params.set("page", "1");
    router.push(`/dashboard/applications?${params.toString()}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (currentStatus) params.set("status", currentStatus);
    if (search.trim()) params.set("q", search.trim());
    params.set("page", "1");
    router.push(`/dashboard/applications?${params.toString()}`);
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams();
    if (currentStatus) params.set("status", currentStatus);
    if (search.trim()) params.set("q", search.trim());
    params.set("page", newPage.toString());
    router.push(`/dashboard/applications?${params.toString()}`);
  }

  async function handleConfirmWithdraw() {
    if (!selectedAppForWithdraw) return;
    setWithdrawLoading(true);
    setWithdrawError(null);
    try {
      const res = await fetch(`/api/me/applications/${selectedAppForWithdraw.id}/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: withdrawReason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to withdraw application.");
      }
      setSelectedAppForWithdraw(null);
      setWithdrawReason("");
      router.refresh();
    } catch (err: unknown) {
      setWithdrawError(err instanceof Error ? err.message : "Error withdrawing application");
    } finally {
      setWithdrawLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
            My Applications
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Track your job applications, review submitted profile snapshots, and monitor hiring pipeline status.
          </p>
        </div>
        <Link
          href="/jobs"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs sm:text-sm shadow-sm transition-colors self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Browse Open Jobs
        </Link>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 overflow-x-auto no-scrollbar">
          {statusTabs.map((tab) => {
            const isActive = currentStatus === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => handleFilter(tab.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? "bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by job or company..."
              className="w-full px-3 py-2 pl-9 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
            <svg
              className="w-4 h-4 text-zinc-400 absolute left-3 top-2.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            type="submit"
            className="px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs sm:text-sm font-semibold transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Applications List */}
      {initialApplications.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8">
          <div className="w-14 h-14 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-4">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            {currentStatus || currentQuery ? "No applications matching filters" : "You haven't submitted any applications yet"}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 max-w-sm mx-auto">
            {currentStatus || currentQuery
              ? "Try clearing filters or search terms to see your other applications."
              : "Explore thousands of verified jobs and apply with your saved profile and resume."}
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            {(currentStatus || currentQuery) && (
              <button
                onClick={() => {
                  setSearch("");
                  router.push("/dashboard/applications");
                }}
                className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition-colors"
              >
                Clear Filters
              </button>
            )}
            <Link
              href="/jobs"
              className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-xs"
            >
              Browse Open Jobs
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {initialApplications.map((app) => {
            const badge = getStatusBadge(app.status);
            const canWithdraw = ["SUBMITTED", "UNDER_REVIEW", "SHORTLISTED"].includes(app.status);
            return (
              <div
                key={app.id}
                className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                  {/* Left Column: Job & Company Info */}
                  <div className="flex items-start gap-4 flex-1">
                    <div className="w-12 h-12 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50 flex items-center justify-center shrink-0 overflow-hidden font-bold text-zinc-700 dark:text-zinc-300">
                      {app.job.company.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={app.job.company.logo}
                          alt={app.job.company.name}
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        app.job.company.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">
                          {app.job.company.name}
                        </span>
                        {app.job.company.verification === "VERIFIED" && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400">
                            <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                            </svg>
                            Verified
                          </span>
                        )}
                        <span className="text-zinc-300 dark:text-zinc-700">•</span>
                        <span className="text-xs text-zinc-400">
                          Applied {new Date(app.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
                        </span>
                      </div>

                      <h2 className="text-base sm:text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-1 hover:text-blue-600 transition-colors">
                        <Link href={`/jobs/${app.job.slug}`} target="_blank">
                          {app.job.title}
                        </Link>
                      </h2>

                      <div className="flex items-center gap-2 sm:gap-4 mt-2 text-xs text-zinc-500 dark:text-zinc-400 flex-wrap">
                        <span className="flex items-center gap-1">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {app.job.location}
                        </span>
                        <span>•</span>
                        <span className="capitalize">{app.job.employmentType.toLowerCase().replace("_", " ")}</span>
                        {app.job.category && (
                          <>
                            <span>•</span>
                            <span>{app.job.category.name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Status & Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between lg:justify-end gap-3 lg:gap-4 pt-3 lg:pt-0 border-t lg:border-t-0 border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${badge.className}`}>
                        {badge.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      {/* View Resume Button */}
                      {app.resumeStorageKey && (
                        <a
                          href={`/api/me/applications/${app.id}/resume`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                          title={`View submitted resume: ${app.resumeFileName || "resume.pdf"}`}
                        >
                          <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Resume
                        </a>
                      )}

                      {/* View Snapshot Button */}
                      <button
                        type="button"
                        onClick={() => setSelectedAppForSnapshot(app)}
                        className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors inline-flex items-center gap-1.5 shadow-2xs"
                      >
                        <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                        Snapshot
                      </button>

                      {/* Withdraw Button */}
                      {canWithdraw && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedAppForWithdraw(app);
                            setWithdrawError(null);
                            setWithdrawReason("");
                          }}
                          className="px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-transparent hover:border-rose-200 dark:hover:border-rose-900 transition-colors"
                        >
                          Withdraw
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Timeline Snippet */}
                {app.statusHistory.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      Latest update:{" "}
                      <strong className="text-zinc-700 dark:text-zinc-300 font-semibold">
                        {app.statusHistory[0].newStatus.replace("_", " ")}
                      </strong>{" "}
                      on {new Date(app.statusHistory[0].createdAt).toLocaleDateString()}
                      {app.statusHistory[0].reason && (
                        <span className="italic text-zinc-400"> — &quot;{app.statusHistory[0].reason}&quot;</span>
                      )}
                    </span>
                    <span className="text-[11px] text-zinc-400">
                      {app.statusHistory.length} event{app.statusHistory.length > 1 ? "s" : ""}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-zinc-500">
            Showing Page <span className="font-semibold text-zinc-900 dark:text-zinc-100">{pagination.page}</span> of{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{pagination.totalPages}</span> ({pagination.total} applications)
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages}
              className="px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Snapshot Modal */}
      {selectedAppForSnapshot && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Submitted Profile Snapshot
                </span>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {selectedAppForSnapshot.job.title}
                </h3>
                <p className="text-xs text-zinc-500">
                  {selectedAppForSnapshot.job.company.name} • Captured at{" "}
                  {new Date(selectedAppForSnapshot.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAppForSnapshot(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Candidate Snapshot Details */}
            {selectedAppForSnapshot.profileSnapshot && (
              <div className="space-y-5 text-xs sm:text-sm">
                {/* Candidate Info */}
                <div className="bg-zinc-50 dark:bg-zinc-800/40 rounded-xl p-4 space-y-2 border border-zinc-100 dark:border-zinc-800">
                  <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Candidate Information</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-600 dark:text-zinc-300">
                    <div>
                      <span className="text-zinc-400">Name: </span>
                      {selectedAppForSnapshot.profileSnapshot.name || "N/A"}
                    </div>
                    <div>
                      <span className="text-zinc-400">Email: </span>
                      {selectedAppForSnapshot.profileSnapshot.email || "N/A"}
                    </div>
                    <div>
                      <span className="text-zinc-400">Phone: </span>
                      {selectedAppForSnapshot.profileSnapshot.phone || "Not provided"}
                    </div>
                    <div>
                      <span className="text-zinc-400">Location: </span>
                      {selectedAppForSnapshot.profileSnapshot.location || "Not provided"}
                    </div>
                  </div>
                  {selectedAppForSnapshot.profileSnapshot.headline && (
                    <div className="pt-2 border-t border-zinc-200/50 dark:border-zinc-700/50">
                      <span className="text-zinc-400">Headline: </span>
                      <span className="text-zinc-800 dark:text-zinc-200 font-medium">
                        {selectedAppForSnapshot.profileSnapshot.headline}
                      </span>
                    </div>
                  )}
                  {selectedAppForSnapshot.profileSnapshot.bio && (
                    <div className="pt-1">
                      <span className="text-zinc-400 block mb-1">Bio:</span>
                      <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-line bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-xs">
                        {selectedAppForSnapshot.profileSnapshot.bio}
                      </p>
                    </div>
                  )}
                </div>

                {/* Submitted Resume Info */}
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Submitted Resume</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {selectedAppForSnapshot.resumeFileName || "resume.pdf"}
                      {selectedAppForSnapshot.resumeFileSize
                        ? ` (${formatFileSize(selectedAppForSnapshot.resumeFileSize)})`
                        : ""}
                    </p>
                  </div>
                  {selectedAppForSnapshot.resumeStorageKey && (
                    <a
                      href={`/api/me/applications/${selectedAppForSnapshot.id}/resume`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 text-xs font-semibold shadow-xs"
                    >
                      Download Copy
                    </a>
                  )}
                </div>

                {/* Cover Letter */}
                {selectedAppForSnapshot.coverLetter && (
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Cover Letter / Note to Recruiter</h4>
                    <div className="bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-zinc-100 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 whitespace-pre-line text-xs">
                      {selectedAppForSnapshot.coverLetter}
                    </div>
                  </div>
                )}

                {/* Education Snapshot */}
                {selectedAppForSnapshot.profileSnapshot.education?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Education</h4>
                    <div className="space-y-2">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {selectedAppForSnapshot.profileSnapshot.education.map((edu: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 text-xs">
                          <div className="font-bold text-zinc-900 dark:text-zinc-100">
                            {edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ""}
                          </div>
                          <div className="text-zinc-500 mt-0.5">{edu.institution}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience Snapshot */}
                {selectedAppForSnapshot.profileSnapshot.experience?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Experience</h4>
                    <div className="space-y-2">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {selectedAppForSnapshot.profileSnapshot.experience.map((exp: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-100 dark:border-zinc-800 text-xs">
                          <div className="font-bold text-zinc-900 dark:text-zinc-100">
                            {exp.jobTitle}
                          </div>
                          <div className="text-zinc-500 mt-0.5">{exp.companyName}</div>
                          {exp.description && (
                            <p className="mt-1 text-zinc-600 dark:text-zinc-400 whitespace-pre-line">
                              {exp.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Skills Snapshot */}
                {selectedAppForSnapshot.profileSnapshot.skills?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Skills</h4>
                    <div className="flex flex-wrap gap-1.5">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {selectedAppForSnapshot.profileSnapshot.skills.map((s: any, idx: number) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 text-xs font-medium"
                        >
                          {s.name || s.skill?.name || "Skill"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status Audit Log */}
                {selectedAppForSnapshot.statusHistory?.length > 0 && (
                  <div className="space-y-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <h4 className="font-bold text-zinc-900 dark:text-zinc-100">Status History Timeline</h4>
                    <div className="space-y-2">
                      {selectedAppForSnapshot.statusHistory.map((hist) => (
                        <div key={hist.id} className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-800/30 text-xs flex items-center justify-between">
                          <div>
                            <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                              {hist.newStatus.replace("_", " ")}
                            </span>
                            {hist.reason && (
                              <span className="text-zinc-500 block text-[11px] mt-0.5">
                                Reason: &quot;{hist.reason}&quot;
                              </span>
                            )}
                          </div>
                          <span className="text-zinc-400 text-[11px]">
                            {new Date(hist.createdAt).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedAppForSnapshot(null)}
                className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                Close Snapshot
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw Modal */}
      {selectedAppForWithdraw && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
              Withdraw Application?
            </h3>
            <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-400">
              Are you sure you want to withdraw your application for{" "}
              <strong>{selectedAppForWithdraw.job.title}</strong> at{" "}
              <strong>{selectedAppForWithdraw.job.company.name}</strong>?
            </p>

            {withdrawError && (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
                {withdrawError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Optional reason for withdrawing:
              </label>
              <textarea
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                rows={3}
                placeholder="e.g., Accepted another offer, changed relocation plans, etc."
                className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={withdrawLoading}
                onClick={() => setSelectedAppForWithdraw(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={withdrawLoading}
                onClick={handleConfirmWithdraw}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {withdrawLoading ? "Withdrawing..." : "Confirm Withdrawal"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
