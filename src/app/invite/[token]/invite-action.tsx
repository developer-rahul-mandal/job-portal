"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function InviteAction({ token, companyName }: { token: string; companyName: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleAccept = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.push("/recruiter/dashboard");
        router.refresh();
      } else {
        setStatus(data.message || "Failed to accept invitation.");
      }
    } catch {
      setStatus("Network error accepting invitation.");
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch(`/api/invitations/${token}/decline`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus("Invitation declined.");
      } else {
        setStatus(data.message || "Failed to decline invitation.");
      }
    } catch {
      setStatus("Network error declining invitation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {status && (
        <div className="p-3.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-medium text-zinc-800 dark:text-zinc-200 text-center">
          {status}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          type="button"
          disabled={loading}
          onClick={handleAccept}
          className="flex-1 py-3 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? "Processing..." : `Accept & Join ${companyName}`}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={handleDecline}
          className="py-3 px-5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-sm transition disabled:opacity-50"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
