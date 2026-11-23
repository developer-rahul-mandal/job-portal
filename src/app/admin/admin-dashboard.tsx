"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Metrics = {
  totalUsers: number;
  totalCompanies: number;
  pendingRecruitersCount: number;
  pendingCompaniesCount: number;
  pendingJobsCount: number;
  publishedJobsCount: number;
  totalApplicationsCount: number;
};

type RecruiterItem = {
  id: string;
  userId: string;
  membershipRole: string;
  verificationStatus: string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
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
};

type CompanyItem = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  location?: string | null;
  website?: string | null;
  normalizedDomain?: string | null;
  officialEmail?: string | null;
  verification: string;
  createdAt: string;
  _count: {
    jobs: number;
    recruiters: number;
  };
};

type JobItem = {
  id: string;
  title: string;
  slug: string;
  role: string;
  location: string;
  employmentType: string;
  status: string;
  applicationMethod: string;
  createdAt: string;
  rejectionReason?: string | null;
  company: {
    id: string;
    name: string;
    slug: string;
    logo?: string | null;
    verification: string;
  };
  postedBy: {
    id: string;
    name: string | null;
    email: string;
  };
  category: {
    name: string;
  };
  _count?: {
    applications: number;
  };
};

type AdminDashboardProps = {
  metrics: Metrics;
  initialJobs: JobItem[];
  initialCompanies: CompanyItem[];
  initialRecruiters: RecruiterItem[];
};

export default function AdminDashboard({
  metrics,
  initialJobs,
  initialCompanies,
  initialRecruiters,
}: AdminDashboardProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"jobs" | "companies" | "recruiters">("jobs");

  // Rejection modal state
  const [rejectModal, setRejectModal] = useState<{
    type: "job" | "company" | "recruiter";
    id: string;
    title: string;
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; isError?: boolean } | null>(null);

  const handleApproveJob = async (jobId: string) => {
    setIsSubmitting(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/admin/jobs/${jobId}/approve`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ text: data.message });
        router.refresh();
      } else {
        setStatusMsg({ text: data.message || "Failed to approve job.", isError: true });
      }
    } catch {
      setStatusMsg({ text: "Network error approving job.", isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCompany = async (companyId: string) => {
    setIsSubmitting(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/admin/companies/${companyId}/verify`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ text: data.message });
        router.refresh();
      } else {
        setStatusMsg({ text: data.message || "Failed to verify company.", isError: true });
      }
    } catch {
      setStatusMsg({ text: "Network error verifying company.", isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleApproveRecruiter = async (recruiterId: string) => {
    setIsSubmitting(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`/api/admin/recruiters/${recruiterId}/approve`, { method: "POST" });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ text: data.message });
        router.refresh();
      } else {
        setStatusMsg({ text: data.message || "Failed to approve recruiter.", isError: true });
      }
    } catch {
      setStatusMsg({ text: "Network error approving recruiter.", isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitRejection = async () => {
    if (!rejectModal || !rejectReason.trim()) return;
    setIsSubmitting(true);
    setStatusMsg(null);

    let url = "";
    if (rejectModal.type === "job") url = `/api/admin/jobs/${rejectModal.id}/reject`;
    if (rejectModal.type === "company") url = `/api/admin/companies/${rejectModal.id}/reject`;
    if (rejectModal.type === "recruiter") url = `/api/admin/recruiters/${rejectModal.id}/reject`;

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMsg({ text: data.message });
        setRejectModal(null);
        setRejectReason("");
        router.refresh();
      } else {
        setStatusMsg({ text: data.message || "Failed to reject.", isError: true });
      }
    } catch {
      setStatusMsg({ text: "Network error submitting rejection.", isError: true });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Metric Counters Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[11px] text-zinc-500 font-medium block">Total Users</span>
          <span className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 mt-1 block">
            {metrics.totalUsers}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[11px] text-zinc-500 font-medium block">Companies</span>
          <span className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 mt-1 block">
            {metrics.totalCompanies}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[11px] text-zinc-500 font-medium block">Published Jobs</span>
          <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1 block">
            {metrics.publishedJobsCount}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs">
          <span className="text-[11px] text-zinc-500 font-medium block">Applications</span>
          <span className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-1 block">
            {metrics.totalApplicationsCount}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 shadow-xs">
          <span className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold block">Pending Jobs</span>
          <span className="text-xl font-extrabold text-amber-900 dark:text-amber-200 mt-1 block">
            {metrics.pendingJobsCount}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 shadow-xs">
          <span className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold block">Pending Companies</span>
          <span className="text-xl font-extrabold text-amber-900 dark:text-amber-200 mt-1 block">
            {metrics.pendingCompaniesCount}
          </span>
        </div>
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 shadow-xs">
          <span className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold block">Pending Recruiters</span>
          <span className="text-xl font-extrabold text-amber-900 dark:text-amber-200 mt-1 block">
            {metrics.pendingRecruitersCount}
          </span>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold ${
            statusMsg.isError
              ? "bg-red-50 text-red-800 dark:bg-red-950/50 dark:text-red-200 border border-red-200"
              : "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200 border border-emerald-200"
          }`}
        >
          {statusMsg.text}
        </div>
      )}

      {/* Moderation Queue Tabs */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("jobs")}
            className={`pb-3 text-sm font-bold border-b-2 transition -mb-px flex items-center gap-2 ${
              activeTab === "jobs"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Job Moderation Queue
            {metrics.pendingJobsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold">
                {metrics.pendingJobsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("companies")}
            className={`pb-3 text-sm font-bold border-b-2 transition -mb-px flex items-center gap-2 ${
              activeTab === "companies"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Company Verification Queue
            {metrics.pendingCompaniesCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold">
                {metrics.pendingCompaniesCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("recruiters")}
            className={`pb-3 text-sm font-bold border-b-2 transition -mb-px flex items-center gap-2 ${
              activeTab === "recruiters"
                ? "border-blue-600 text-blue-600 dark:text-blue-400"
                : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Recruiter Identity Queue
            {metrics.pendingRecruitersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-bold">
                {metrics.pendingRecruitersCount}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Jobs Moderation */}
        {activeTab === "jobs" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Pending Job Reviews & Publications ({initialJobs.length})
            </h3>
            {initialJobs.length === 0 ? (
              <p className="text-xs text-zinc-400 py-8 text-center">No jobs currently pending review.</p>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                {initialJobs.map((job) => (
                  <div key={job.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{job.title}</span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {job.status}
                        </span>
                        <span className="text-xs text-zinc-500 font-medium">• {job.company.name}</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        Category: {job.category.name} | Type: {job.employmentType} | Location: {job.location} | Posted by: {job.postedBy.name || job.postedBy.email}
                      </p>
                      {job.rejectionReason && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1 font-medium">
                          Previous Rejection: {job.rejectionReason}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {job.status !== "PUBLISHED" && (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleApproveJob(job.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition disabled:opacity-50"
                        >
                          Approve & Publish
                        </button>
                      )}
                      {job.status !== "REJECTED" && (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => {
                            setRejectModal({ type: "job", id: job.id, title: `Job: ${job.title}` });
                            setRejectReason("");
                          }}
                          className="px-3.5 py-1.5 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-semibold text-xs transition disabled:opacity-50"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Companies Verification */}
        {activeTab === "companies" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Company Verification Reviews ({initialCompanies.length})
            </h3>
            {initialCompanies.length === 0 ? (
              <p className="text-xs text-zinc-400 py-8 text-center">No companies currently pending verification.</p>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                {initialCompanies.map((comp) => (
                  <div key={comp.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">{comp.name}</span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {comp.verification}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        Domain: {comp.normalizedDomain || "None"} | Location: {comp.location || "Not set"} | Email: {comp.officialEmail || "None"} | Recruiters: {comp._count.recruiters} | Jobs: {comp._count.jobs}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {comp.verification !== "VERIFIED" && (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleVerifyCompany(comp.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition disabled:opacity-50"
                        >
                          Verify Company
                        </button>
                      )}
                      {comp.verification !== "REJECTED" && (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => {
                            setRejectModal({ type: "company", id: comp.id, title: `Company: ${comp.name}` });
                            setRejectReason("");
                          }}
                          className="px-3.5 py-1.5 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-semibold text-xs transition disabled:opacity-50"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Recruiters Identity Verification */}
        {activeTab === "recruiters" && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Recruiter Identity Verifications ({initialRecruiters.length})
            </h3>
            {initialRecruiters.length === 0 ? (
              <p className="text-xs text-zinc-400 py-8 text-center">No recruiters currently pending verification.</p>
            ) : (
              <div className="divide-y divide-zinc-200 dark:divide-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                {initialRecruiters.map((rec) => (
                  <div key={rec.id} className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">
                          {rec.user.name || rec.user.email}
                        </span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                          {rec.verificationStatus}
                        </span>
                        <span className="text-xs text-zinc-500 font-medium">({rec.membershipRole})</span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        Company: {rec.company.name} | Email: {rec.user.email} | Joined: {new Date(rec.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {rec.verificationStatus !== "VERIFIED" && (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => handleApproveRecruiter(rec.id)}
                          className="px-3.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition disabled:opacity-50"
                        >
                          Verify Recruiter
                        </button>
                      )}
                      {rec.verificationStatus !== "REJECTED" && (
                        <button
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => {
                            setRejectModal({
                              type: "recruiter",
                              id: rec.id,
                              title: `Recruiter: ${rec.user.name || rec.user.email}`,
                            });
                            setRejectReason("");
                          }}
                          className="px-3.5 py-1.5 rounded-lg border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 font-semibold text-xs transition disabled:opacity-50"
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mandatory Rejection Dialog */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Reject Verification: {rejectModal.title}
            </h3>
            <p className="text-xs text-zinc-500">
              Please specify the mandatory reason for rejection. This feedback will be recorded in the audit log and displayed to the user.
            </p>
            <textarea
              rows={3}
              required
              maxLength={500}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="e.g. Official business registration certificate could not be confirmed..."
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectModal(null)}
                className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting || !rejectReason.trim()}
                onClick={handleSubmitRejection}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
