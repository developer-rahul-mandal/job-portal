"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ApplicationsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("ATS_APPLICATIONS_ERROR:", error);
  }, [error]);

  return (
    <div className="max-w-lg mx-auto py-12 px-4 text-center space-y-4">
      <div className="w-14 h-14 rounded-2xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto text-2xl font-bold shadow-xs">
        ⚠️
      </div>
      <h2 className="text-xl font-extrabold text-zinc-900 dark:text-zinc-100">
        Unable to Load Applications
      </h2>
      <p className="text-xs sm:text-sm text-zinc-500 max-w-md mx-auto leading-relaxed">
        {error.message || "An unexpected error occurred while loading candidates for this job opening."}
      </p>
      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => reset()}
          className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition shadow-xs"
        >
          Try Again
        </button>
        <Link
          href="/recruiter/jobs"
          className="px-5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-xs transition"
        >
          Back to Job Postings
        </Link>
      </div>
    </div>
  );
}
