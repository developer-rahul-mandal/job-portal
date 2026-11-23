"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AuthModal from "@/components/auth/auth-modal";
import JobApplyModal from "./job-apply-modal";

interface JobApplyButtonProps {
  job: {
    id: string;
    slug: string;
    title: string;
    applicationMethod: "INTERNAL" | "EXTERNAL" | "EMAIL";
    applicationUrl: string | null;
    applicationEmail: string | null;
    allowGuestApply: boolean;
  };
  currentUser?: {
    id: string;
    email: string;
    name?: string | null;
  } | null;
}

export default function JobApplyButton({ job, currentUser }: JobApplyButtonProps) {
  const router = useRouter();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isInternalModalOpen, setIsInternalModalOpen] = useState(false);
  const [isTrackingClick, setIsTrackingClick] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleApplyClick = async () => {
    setErrorMessage(null);

    // 1. External application flow
    if (job.applicationMethod === "EXTERNAL") {
      setIsTrackingClick(true);
      try {
        const res = await fetch(`/api/jobs/${job.slug}/click`, {
          method: "POST",
        });

        const data = await res.json();

        if (res.ok && data.success && data.data?.applicationUrl) {
          window.open(data.data.applicationUrl, "_blank", "noopener,noreferrer");
        } else {
          // Fallback to stored URL if valid
          if (job.applicationUrl && ["http:", "https:"].includes(new URL(job.applicationUrl).protocol)) {
            window.open(job.applicationUrl, "_blank", "noopener,noreferrer");
          } else {
            setErrorMessage(data.message || "Failed to retrieve external application URL.");
          }
        }
      } catch (err) {
        console.error("External apply tracking error:", err);
        if (job.applicationUrl) {
          window.open(job.applicationUrl, "_blank", "noopener,noreferrer");
        } else {
          setErrorMessage("Failed to open application link.");
        }
      } finally {
        setIsTrackingClick(false);
      }
      return;
    }

    // 2. Email application flow
    if (job.applicationMethod === "EMAIL") {
      if (job.applicationEmail) {
        window.location.href = `mailto:${job.applicationEmail}?subject=${encodeURIComponent(
          `Application for ${job.title}`
        )}`;
      } else {
        setErrorMessage("Employer email address is not configured for this job.");
      }
      return;
    }

    // 3. Internal application flow
    if (job.applicationMethod === "INTERNAL") {
      if (!currentUser) {
        // Open Auth modal for unauthenticated visitors
        setIsAuthModalOpen(true);
      } else {
        // Authenticated candidate continues to internal application review modal
        setIsInternalModalOpen(true);
      }
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false);
    router.refresh();
    // After authentication, open the internal application dialog
    setIsInternalModalOpen(true);
  };

  return (
    <>
      <div className="space-y-2">
        <button
          type="button"
          onClick={handleApplyClick}
          disabled={isTrackingClick}
          className="w-full sm:w-auto min-w-[200px] px-6 py-3 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold text-sm hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-md disabled:opacity-50 cursor-pointer text-center"
        >
          {isTrackingClick ? (
            "Connecting..."
          ) : job.applicationMethod === "EXTERNAL" ? (
            <span className="flex items-center justify-center gap-1.5">
              <span>Apply on Company Site</span>
              <span className="text-xs">↗</span>
            </span>
          ) : job.applicationMethod === "EMAIL" ? (
            "Apply via Email"
          ) : (
            "Apply for Job"
          )}
        </button>

        {errorMessage && (
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">
            {errorMessage}
          </p>
        )}
      </div>

      {/* Guest Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={handleAuthSuccess}
        redirectUrl={typeof window !== "undefined" ? window.location.pathname : undefined}
      />

      {/* Phase 4 Internal Application Modal */}
      {currentUser && (
        <JobApplyModal
          isOpen={isInternalModalOpen}
          onClose={() => setIsInternalModalOpen(false)}
          job={{
            id: job.id,
            slug: job.slug,
            title: job.title,
          }}
          currentUser={currentUser}
        />
      )}
    </>
  );
}
