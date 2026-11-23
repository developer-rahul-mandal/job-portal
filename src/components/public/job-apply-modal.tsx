"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface ResumeItem {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  isDefault: boolean;
  createdAt: string;
}

interface JobApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: {
    id: string;
    slug: string;
    title: string;
  };
  currentUser: {
    id: string;
    email: string;
    name?: string | null;
  };
}

export default function JobApplyModal({
  isOpen,
  onClose,
  job,
  currentUser,
}: JobApplyModalProps) {
  const [resumes, setResumes] = useState<ResumeItem[]>([]);
  const [selectedResumeId, setSelectedResumeId] = useState<string>("");
  const [coverLetter, setCoverLetter] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    fetch("/api/me/resumes")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load your resumes.");
        return res.json();
      })
      .then((data) => {
        if (!mounted) return;
        const list = (data.data || []) as ResumeItem[];
        setResumes(list);

        // Pre-select default resume or first resume
        const def = list.find((r) => r.isDefault) || list[0];
        if (def) {
          setSelectedResumeId(def.id);
        }
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err.message || "Failed to load resumes.");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  function handleClose() {
    setLoading(true);
    setError(null);
    setSuccess(false);
    onClose();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!selectedResumeId) {
      setError("Please select an uploaded resume to submit with your application.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/jobs/${job.slug}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeId: selectedResumeId,
          coverLetter: coverLetter.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to submit application.");
      }

      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit application.");
    } finally {
      setSubmitting(false);
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 sm:p-8 relative max-h-[90vh] overflow-y-auto">
        <button
          type="button"
          onClick={handleClose}
          className="absolute top-5 right-5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg font-bold"
        >
          ✕
        </button>

        {success ? (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto text-2xl font-bold">
              ✓
            </div>
            <div>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                Application Submitted!
              </h3>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
                Your credentials, profile snapshot, and selected resume have been submitted for <strong>{job.title}</strong>.
              </p>
            </div>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/dashboard/applications"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs"
              >
                View My Applications
              </Link>
              <button
                type="button"
                onClick={handleClose}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                Direct Application
              </span>
              <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100 mt-1">
                Apply for {job.title}
              </h2>
              <p className="text-xs text-zinc-500 mt-1">
                Applying as <span className="font-semibold text-zinc-800 dark:text-zinc-200">{currentUser.name || currentUser.email}</span>
              </p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-xs text-red-700 dark:text-red-300 flex items-start gap-2.5">
                <svg className="w-4 h-4 shrink-0 mt-0.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="flex-1">{error}</div>
              </div>
            )}

            {/* Resume Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  Select Resume <span className="text-red-500">*</span>
                </label>
                <Link
                  href="/dashboard/resumes"
                  target="_blank"
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  + Upload New Resume
                </Link>
              </div>

              {loading ? (
                <div className="p-6 text-center text-xs text-zinc-400">Loading your resumes...</div>
              ) : resumes.length === 0 ? (
                <div className="p-5 rounded-xl border border-dashed border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 text-center space-y-2">
                  <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                    You have not uploaded any resumes yet.
                  </p>
                  <p className="text-[11px] text-zinc-500">
                    A resume document (PDF, DOC, or DOCX) is required to submit an internal application.
                  </p>
                  <div className="pt-2">
                    <Link
                      href="/dashboard/resumes"
                      target="_blank"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs shadow-xs"
                    >
                      Upload Resume in Dashboard
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {resumes.map((r) => {
                    const isSelected = selectedResumeId === r.id;
                    return (
                      <label
                        key={r.id}
                        className={`flex items-center justify-between p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/20"
                            : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <input
                            type="radio"
                            name="resumeSelection"
                            value={r.id}
                            checked={isSelected}
                            onChange={() => setSelectedResumeId(r.id)}
                            className="w-4 h-4 text-blue-600 border-zinc-300"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                                {r.title}
                              </span>
                              {r.isDefault && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                                  Default
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-zinc-500 mt-0.5">
                              {r.fileName} • {formatBytes(r.fileSize)}
                            </div>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Optional Cover Letter */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                  Cover Letter / Notes (Optional)
                </label>
                <span className="text-[11px] text-zinc-400">{coverLetter.length}/10,000</span>
              </div>
              <textarea
                rows={4}
                maxLength={10000}
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                placeholder="Introduce yourself and explain why you're a great fit for this position..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Note on profile snapshot */}
            <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 leading-relaxed">
              Submitting will automatically attach a verified snapshot of your profile credentials (education, experience, and skills) along with an immutable copy of your selected resume.
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || resumes.length === 0}
                className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs disabled:opacity-50 inline-flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Submitting Application...
                  </>
                ) : (
                  "Submit Application"
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
