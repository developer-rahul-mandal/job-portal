"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface CandidateApplicationItem {
  id: string;
  applicantName: string;
  applicantEmail: string;
  status: string;
  coverLetter: string | null;
  resumeFileName: string | null;
  resumeFileSize: number | null;
  resumeMimeType: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  profileSnapshot: any;
  createdAt: string;
  updatedAt: string;
  statusHistory: {
    id: string;
    previousStatus: string | null;
    newStatus: string;
    reason: string | null;
    createdAt: string;
    changedBy?: {
      name?: string | null;
      role?: string | null;
    } | null;
  }[];
}

interface CandidatesManagerProps {
  job: {
    id: string;
    slug: string;
    title: string;
    role: string;
    location: string;
    status: string;
    applicationMethod: string;
    company: {
      id: string;
      name: string;
    };
  };
  initialApplications: CandidateApplicationItem[];
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
  { label: "All Candidates", value: "" },
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
        label: "Rejected",
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

function getAvailableTransitions(currentStatus: string): string[] {
  switch (currentStatus) {
    case "SUBMITTED":
      return ["UNDER_REVIEW", "SHORTLISTED", "REJECTED"];
    case "UNDER_REVIEW":
      return ["SHORTLISTED", "REJECTED", "HIRED"];
    case "SHORTLISTED":
      return ["HIRED", "REJECTED", "UNDER_REVIEW"];
    case "REJECTED":
      return ["UNDER_REVIEW", "SHORTLISTED"];
    case "HIRED":
      return ["UNDER_REVIEW", "SHORTLISTED", "REJECTED"];
    case "WITHDRAWN":
    default:
      return [];
  }
}

function formatFileSize(bytes?: number | null): string {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CandidatesManager({
  job,
  initialApplications,
  pagination,
  currentStatus,
  currentQuery,
}: CandidatesManagerProps) {
  const router = useRouter();
  const [search, setSearch] = useState(currentQuery);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateApplicationItem | null>(null);

  // Status transition state inside review modal
  const [targetStatus, setTargetStatus] = useState<string>("");
  const [statusReason, setStatusReason] = useState<string>("");
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);

  function handleFilter(statusValue: string) {
    const params = new URLSearchParams();
    if (statusValue) params.set("status", statusValue);
    if (search.trim()) params.set("q", search.trim());
    params.set("page", "1");
    router.push(`/recruiter/jobs/${job.id}/applications?${params.toString()}`);
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (currentStatus) params.set("status", currentStatus);
    if (search.trim()) params.set("q", search.trim());
    params.set("page", "1");
    router.push(`/recruiter/jobs/${job.id}/applications?${params.toString()}`);
  }

  function handlePageChange(newPage: number) {
    const params = new URLSearchParams();
    if (currentStatus) params.set("status", currentStatus);
    if (search.trim()) params.set("q", search.trim());
    params.set("page", newPage.toString());
    router.push(`/recruiter/jobs/${job.id}/applications?${params.toString()}`);
  }

  function openCandidateReview(cand: CandidateApplicationItem) {
    setSelectedCandidate(cand);
    const transitions = getAvailableTransitions(cand.status);
    setTargetStatus(transitions[0] || "");
    setStatusReason("");
    setStatusUpdateError(null);
  }

  async function handleUpdateStatus() {
    if (!selectedCandidate || !targetStatus) return;
    setStatusUpdateLoading(true);
    setStatusUpdateError(null);

    try {
      const res = await fetch(`/api/recruiter/applications/${selectedCandidate.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          reason: statusReason.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to update candidate status.");
      }

      // Update selectedCandidate locally
      const updatedHistoryItem = {
        id: `temp-${Date.now()}`,
        previousStatus: selectedCandidate.status,
        newStatus: targetStatus,
        reason: statusReason.trim() || null,
        createdAt: new Date().toISOString(),
        changedBy: { name: "You", role: "RECRUITER" },
      };

      const updatedCandidate = {
        ...selectedCandidate,
        status: targetStatus,
        statusHistory: [updatedHistoryItem, ...selectedCandidate.statusHistory],
      };

      setSelectedCandidate(updatedCandidate);
      const newTransitions = getAvailableTransitions(targetStatus);
      setTargetStatus(newTransitions[0] || "");
      setStatusReason("");
      router.refresh();
    } catch (err: unknown) {
      setStatusUpdateError(err instanceof Error ? err.message : "Error updating candidate status");
    } finally {
      setStatusUpdateLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Job Summary Header */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-xs">
        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-2">
          <Link href="/recruiter/jobs" className="hover:text-blue-600 transition-colors flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Job Postings
          </Link>
          <span>/</span>
          <span className="text-zinc-700 dark:text-zinc-300 font-medium">ATS Candidate Pipeline</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
                {job.title}
              </h1>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                {job.applicationMethod}
              </span>
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
                {job.status}
              </span>
            </div>
            <p className="text-xs text-zinc-500 mt-1">
              {job.company.name} • {job.role} • {job.location}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 text-center">
              <div className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100">
                {pagination.total}
              </div>
              <div className="text-[10px] uppercase font-bold text-zinc-500">
                Total Applicants
              </div>
            </div>
            {job.status === "PUBLISHED" && (
              <Link
                href={`/jobs/${job.slug}`}
                target="_blank"
                className="px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors inline-flex items-center gap-1.5"
              >
                <svg className="w-4 h-4 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View Job
              </Link>
            )}
          </div>
        </div>
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
              placeholder="Search candidate name or email..."
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
            Filter
          </button>
        </form>
      </div>

      {/* Candidates List / ATS Table */}
      {initialApplications.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-8">
          <div className="w-14 h-14 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-4">
            <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
            {currentStatus || currentQuery
              ? "No applicants match the current filter"
              : "No candidates have applied yet"}
          </h3>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
            {currentStatus || currentQuery
              ? "Try resetting the filter to view all applications for this job posting."
              : "When candidates submit internal applications, their preserved resumes and profile snapshots will appear here."}
          </p>
          {(currentStatus || currentQuery) && (
            <button
              onClick={() => {
                setSearch("");
                router.push(`/recruiter/jobs/${job.id}/applications`);
              }}
              className="mt-4 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition-colors"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6">Candidate</th>
                  <th className="py-3.5 px-4">Headline / Summary</th>
                  <th className="py-3.5 px-4">Applied Date</th>
                  <th className="py-3.5 px-4">Pipeline Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {initialApplications.map((cand) => {
                  const badge = getStatusBadge(cand.status);
                  const headline = cand.profileSnapshot?.headline || cand.profileSnapshot?.location || null;
                  return (
                    <tr
                      key={cand.id}
                      className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 transition-colors"
                    >
                      {/* Candidate Column */}
                      <td className="py-4 px-4 sm:px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold text-xs flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-900">
                            {cand.applicantName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-zinc-900 dark:text-zinc-100 truncate">
                              {cand.applicantName}
                            </div>
                            <div className="text-xs text-zinc-500 truncate">
                              {cand.applicantEmail}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Headline / Summary */}
                      <td className="py-4 px-4 text-zinc-600 dark:text-zinc-400 max-w-xs truncate">
                        {headline || (
                          <span className="text-zinc-400 italic">No headline</span>
                        )}
                      </td>

                      {/* Applied Date */}
                      <td className="py-4 px-4 whitespace-nowrap text-zinc-500">
                        {new Date(cand.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      {/* Pipeline Status */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4 text-right whitespace-nowrap space-x-2">
                        {/* Resume Streaming Link */}
                        <a
                          href={`/api/recruiter/applications/${cand.id}/resume`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors inline-flex items-center gap-1 shadow-2xs"
                          title={`View ${cand.resumeFileName || "resume.pdf"}`}
                        >
                          <svg className="w-3.5 h-3.5 text-zinc-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          Resume
                        </a>

                        {/* Review Candidate Modal Trigger */}
                        <button
                          type="button"
                          onClick={() => openCandidateReview(cand)}
                          className="px-3 py-1.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 text-xs font-semibold shadow-xs transition-colors inline-flex items-center gap-1"
                        >
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-zinc-500">
            Showing Page <span className="font-semibold text-zinc-900 dark:text-zinc-100">{pagination.page}</span> of{" "}
            <span className="font-semibold text-zinc-900 dark:text-zinc-100">{pagination.totalPages}</span> ({pagination.total} candidates)
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

      {/* Candidate Review Drawer / Modal */}
      {selectedCandidate && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 shadow-2xl">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-600 text-white font-extrabold text-lg flex items-center justify-center shrink-0">
                  {selectedCandidate.applicantName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                    {selectedCandidate.applicantName}
                  </h3>
                  <p className="text-xs text-zinc-500">
                    {selectedCandidate.applicantEmail} • Applied on{" "}
                    {new Date(selectedCandidate.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getStatusBadge(selectedCandidate.status).className}`}>
                  {getStatusBadge(selectedCandidate.status).label}
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedCandidate(null)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* ATS Status Action Control Section */}
            <div className="p-4 rounded-xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/60 dark:border-blue-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
                  Update Candidate Pipeline Status
                </span>
                <span className="text-[11px] text-zinc-500">
                  Current: <strong>{selectedCandidate.status.replace("_", " ")}</strong>
                </span>
              </div>

              {selectedCandidate.status === "WITHDRAWN" ? (
                <div className="text-xs text-rose-600 dark:text-rose-400 italic">
                  Candidate has withdrawn their application. No further status transitions allowed.
                </div>
              ) : getAvailableTransitions(selectedCandidate.status).length === 0 ? (
                <div className="text-xs text-zinc-500 italic">
                  No further status transitions available from current state.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Move candidate to:
                      </label>
                      <select
                        value={targetStatus}
                        onChange={(e) => setTargetStatus(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      >
                        {getAvailableTransitions(selectedCandidate.status).map((st) => (
                          <option key={st} value={st}>
                            {st.replace("_", " ")}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                        Optional note / reason:
                      </label>
                      <input
                        type="text"
                        value={statusReason}
                        onChange={(e) => setStatusReason(e.target.value)}
                        placeholder="e.g. Cleared technical screen"
                        className="w-full px-3 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {statusUpdateError && (
                    <div className="p-2.5 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300">
                      {statusUpdateError}
                    </div>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      disabled={statusUpdateLoading || !targetStatus}
                      onClick={handleUpdateStatus}
                      className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
                    >
                      {statusUpdateLoading ? "Updating..." : `Move to ${targetStatus.replace("_", " ")}`}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Resume Card */}
            <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  Candidate Resume
                </h4>
                <p className="text-xs text-zinc-500 mt-0.5">
                  {selectedCandidate.resumeFileName || "resume.pdf"}
                  {selectedCandidate.resumeFileSize
                    ? ` (${formatFileSize(selectedCandidate.resumeFileSize)})`
                    : ""}
                </p>
              </div>

              <a
                href={`/api/recruiter/applications/${selectedCandidate.id}/resume`}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 text-xs font-semibold shadow-xs inline-flex items-center gap-1.5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
                View Full Resume
              </a>
            </div>

            {/* Cover Letter */}
            {selectedCandidate.coverLetter && (
              <div className="space-y-1.5">
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  Cover Letter / Note to Recruiter
                </h4>
                <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                  {selectedCandidate.coverLetter}
                </div>
              </div>
            )}

            {/* Snapshot Details */}
            {selectedCandidate.profileSnapshot && (
              <div className="space-y-4">
                <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                  Candidate Profile Snapshot
                </h4>

                {/* Contact Info & Headline */}
                <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-zinc-600 dark:text-zinc-300">
                    <div>
                      <span className="text-zinc-400">Phone: </span>
                      {selectedCandidate.profileSnapshot.phone || "Not provided"}
                    </div>
                    <div>
                      <span className="text-zinc-400">Location: </span>
                      {selectedCandidate.profileSnapshot.location || "Not provided"}
                    </div>
                  </div>
                  {selectedCandidate.profileSnapshot.headline && (
                    <div className="pt-2 border-t border-zinc-200/60 dark:border-zinc-700/60">
                      <span className="text-zinc-400">Headline: </span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        {selectedCandidate.profileSnapshot.headline}
                      </span>
                    </div>
                  )}
                  {selectedCandidate.profileSnapshot.bio && (
                    <div className="pt-1">
                      <span className="text-zinc-400 block mb-1">Bio:</span>
                      <p className="text-zinc-700 dark:text-zinc-300 whitespace-pre-line bg-white dark:bg-zinc-900 p-2.5 rounded-lg border border-zinc-200 dark:border-zinc-800">
                        {selectedCandidate.profileSnapshot.bio}
                      </p>
                    </div>
                  )}
                </div>

                {/* Education */}
                {selectedCandidate.profileSnapshot.education?.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-semibold text-xs text-zinc-500 uppercase tracking-wider">
                      Education
                    </h5>
                    <div className="space-y-2">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {selectedCandidate.profileSnapshot.education.map((edu: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs">
                          <div className="font-bold text-zinc-900 dark:text-zinc-100">
                            {edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ""}
                          </div>
                          <div className="text-zinc-500 mt-0.5">{edu.institution}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Experience */}
                {selectedCandidate.profileSnapshot.experience?.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-semibold text-xs text-zinc-500 uppercase tracking-wider">
                      Experience
                    </h5>
                    <div className="space-y-2">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {selectedCandidate.profileSnapshot.experience.map((exp: any, idx: number) => (
                        <div key={idx} className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs">
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

                {/* Skills */}
                {selectedCandidate.profileSnapshot.skills?.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="font-semibold text-xs text-zinc-500 uppercase tracking-wider">
                      Skills
                    </h5>
                    <div className="flex flex-wrap gap-1.5">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {selectedCandidate.profileSnapshot.skills.map((s: any, idx: number) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-medium"
                        >
                          {s.name || s.skill?.name || "Skill"}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Audit History Timeline */}
            <div className="space-y-2 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <h4 className="font-bold text-zinc-900 dark:text-zinc-100 text-sm">
                Status History Audit Trail
              </h4>
              <div className="space-y-2">
                {selectedCandidate.statusHistory.map((hist) => (
                  <div
                    key={hist.id}
                    className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-xs flex items-center justify-between"
                  >
                    <div>
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        Status changed to{" "}
                        <span className="text-blue-600 dark:text-blue-400">
                          {hist.newStatus.replace("_", " ")}
                        </span>
                        {hist.previousStatus && (
                          <span className="text-zinc-400 font-normal">
                            {" "}(from {hist.previousStatus.replace("_", " ")})
                          </span>
                        )}
                      </div>
                      {hist.reason && (
                        <div className="text-zinc-500 italic mt-0.5">
                          Note: &quot;{hist.reason}&quot;
                        </div>
                      )}
                      {hist.changedBy?.name && (
                        <div className="text-zinc-400 text-[11px] mt-0.5">
                          By {hist.changedBy.name} ({hist.changedBy.role})
                        </div>
                      )}
                    </div>
                    <div className="text-zinc-400 text-[11px] shrink-0">
                      {new Date(hist.createdAt).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Close Button */}
            <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedCandidate(null)}
                className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 transition-colors"
              >
                Close Candidate Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
