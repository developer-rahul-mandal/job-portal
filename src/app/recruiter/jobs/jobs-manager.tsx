"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface JobItem {
  id: string;
  slug: string;
  title: string;
  detailedTitle: string;
  role: string;
  location: string;
  employmentType: string;
  status: string;
  applicationMethod: string;
  applicationCount: number;
  applyClickCount: number;
  publishedAt: string | null;
  deadline: string | null;
  createdAt: string;
  category: {
    id: string;
    name: string;
    slug: string;
  };
}

interface JobsManagerProps {
  initialJobs: JobItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  currentStatus: string;
  currentQuery: string;
}

export default function JobsManager({
  initialJobs,
  pagination,
  currentStatus,
  currentQuery,
}: JobsManagerProps) {
  const router = useRouter();
  const [search, setSearch] = useState(currentQuery);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const statusTabs = [
    { label: "All Jobs", value: "" },
    { label: "Published", value: "PUBLISHED" },
    { label: "Pending Review", value: "PENDING_REVIEW" },
    { label: "Drafts", value: "DRAFT" },
    { label: "Rejected", value: "REJECTED" },
    { label: "Closed", value: "CLOSED" },
    { label: "Expired", value: "EXPIRED" },
  ];

  function handleFilter(statusValue: string) {
    const params = new URLSearchParams();
    if (statusValue) params.set("status", statusValue);
    if (search.trim()) params.set("q", search.trim());
    params.set("page", "1");
    router.push(`/recruiter/jobs?${params.toString()}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (currentStatus) params.set("status", currentStatus);
    if (search.trim()) params.set("q", search.trim());
    params.set("page", "1");
    router.push(`/recruiter/jobs?${params.toString()}`);
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams();
    if (currentStatus) params.set("status", currentStatus);
    if (search.trim()) params.set("q", search.trim());
    params.set("page", newPage.toString());
    router.push(`/recruiter/jobs?${params.toString()}`);
  }

  async function handleStatusChange(jobId: string, newStatus: "PUBLISHED" | "PENDING_REVIEW" | "CLOSED") {
    setActionLoading(jobId);
    setError(null);
    try {
      const res = await fetch(`/api/recruiter/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update job status.");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error updating job status.");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDeleteDraft(jobId: string) {
    setActionLoading(jobId);
    setError(null);
    try {
      const res = await fetch(`/api/recruiter/jobs/${jobId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to delete draft.");
      setDeleteConfirmId(null);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error deleting draft.");
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300 flex items-start gap-3">
          <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Status Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-zinc-100 dark:bg-zinc-800/80 overflow-x-auto">
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

        {/* Search Input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-64">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search jobs..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
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
            className="px-3.5 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-semibold hover:bg-zinc-800 transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* Jobs Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
        {initialJobs.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-400 flex items-center justify-center">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">No job vacancies found</h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                {currentQuery || currentStatus
                  ? "No positions match the specified filters or search term."
                  : "You haven't posted any jobs for this company yet."}
              </p>
            </div>
            <Link
              href="/recruiter/jobs/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs"
            >
              Post a Position
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Title & Details</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Method</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-center">Applications / Clicks</th>
                  <th className="py-3.5 px-4">Created</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
                {initialJobs.map((job) => {
                  const isActionBusy = actionLoading === job.id;

                  return (
                    <tr key={job.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                      {/* Title & Role */}
                      <td className="py-4 px-4 max-w-xs">
                        <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100 line-clamp-1">
                          {job.detailedTitle || job.title}
                        </div>
                        <div className="flex items-center gap-2 text-zinc-500 mt-1">
                          <span>{job.role}</span>
                          <span>•</span>
                          <span>{job.location}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {job.category?.name || "General"}
                        </span>
                      </td>

                      {/* Method */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {job.applicationMethod}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            job.status === "PUBLISHED"
                              ? "bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400"
                              : job.status === "DRAFT"
                              ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                              : job.status === "CLOSED"
                              ? "bg-red-100 dark:bg-red-950/60 text-red-700 dark:text-red-400"
                              : "bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          {job.status}
                        </span>
                      </td>

                      {/* Metrics */}
                      <td className="py-4 px-4 whitespace-nowrap text-center">
                        <Link
                          href={`/recruiter/jobs/${job.slug}/applications`}
                          className="font-bold text-blue-600 dark:text-blue-400 hover:underline text-xs inline-block"
                          title="View applicants in ATS"
                        >
                          {job.applicationCount} apps
                        </Link>
                        <div className="text-[10px] text-zinc-400 mt-0.5">
                          {job.applyClickCount} clicks
                        </div>
                      </td>

                      {/* Created */}
                      <td className="py-4 px-4 whitespace-nowrap text-zinc-500">
                        {new Date(job.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 whitespace-nowrap text-right space-x-2">
                        {/* View Public if Published */}
                        {job.status === "PUBLISHED" && (
                          <Link
                            href={`/jobs/${job.slug}`}
                            target="_blank"
                            className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 inline-block transition-colors"
                            title="View public job posting"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                        )}

                        {/* View Candidates in ATS */}
                        <Link
                          href={`/recruiter/jobs/${job.slug}/applications`}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-blue-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 inline-block transition-colors"
                          title="View applicants / ATS pipeline"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                          </svg>
                        </Link>

                        {/* Edit */}
                        <Link
                          href={`/recruiter/jobs/${job.id}/edit`}
                          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 inline-block transition-colors"
                          title="Edit job posting"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </Link>

                        {/* Submit for Review if Draft or Rejected */}
                        {(job.status === "DRAFT" || job.status === "REJECTED") && (
                          <button
                            type="button"
                            disabled={isActionBusy}
                            onClick={() => handleStatusChange(job.id, "PENDING_REVIEW")}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 inline-block transition-colors disabled:opacity-50"
                            title="Submit for review & publication"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}

                        {/* Quick Close if Published */}
                        {job.status === "PUBLISHED" && (
                          <button
                            type="button"
                            disabled={isActionBusy}
                            onClick={() => handleStatusChange(job.id, "CLOSED")}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 inline-block transition-colors disabled:opacity-50"
                            title="Close applications"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}

                        {/* Delete Draft */}
                        {job.status === "DRAFT" && (
                          <button
                            type="button"
                            disabled={isActionBusy}
                            onClick={() => setDeleteConfirmId(job.id)}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 inline-block transition-colors disabled:opacity-50"
                            title="Delete draft"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-zinc-500">
            Showing Page <span className="font-semibold text-zinc-900 dark:text-zinc-100">{pagination.page}</span> of{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{pagination.totalPages}</span> ({pagination.total} total jobs)
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={pagination.page <= 1}
              onClick={() => handlePageChange(pagination.page - 1)}
              className="px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => handlePageChange(pagination.page + 1)}
              className="px-3 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Delete Draft Modal Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Delete Draft Posting</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Are you sure you want to delete this draft? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionLoading === deleteConfirmId}
                onClick={() => handleDeleteDraft(deleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {actionLoading === deleteConfirmId ? "Deleting..." : "Delete Draft"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
