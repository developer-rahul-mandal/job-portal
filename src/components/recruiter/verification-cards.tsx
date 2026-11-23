"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type VerificationCardsProps = {
  company: {
    id: string;
    name: string;
    verification: string;
  };
  membership: {
    id: string;
    membershipRole: string;
    verificationStatus: string;
    rejectionReason?: string | null;
  };
  canManageCompany: boolean;
};

export default function VerificationCards({
  company,
  membership,
  canManageCompany,
}: VerificationCardsProps) {
  const router = useRouter();
  const [submittingCompany, setSubmittingCompany] = useState(false);
  const [submittingRecruiter, setSubmittingRecruiter] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleRequestCompanyVerify = async () => {
    setSubmittingCompany(true);
    setMsg(null);
    try {
      const res = await fetch("/api/recruiter/company/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Requesting platform verification" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMsg({ type: "success", text: data.message });
        router.refresh();
      } else {
        setMsg({ type: "error", text: data.message || "Failed to submit request." });
      }
    } catch {
      setMsg({ type: "error", text: "Network error submitting company verification." });
    } finally {
      setSubmittingCompany(false);
    }
  };

  const handleRequestRecruiterVerify = async () => {
    setSubmittingRecruiter(true);
    setMsg(null);
    try {
      const res = await fetch("/api/recruiter/verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Requesting recruiter identity verification" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMsg({ type: "success", text: data.message });
        router.refresh();
      } else {
        setMsg({ type: "error", text: data.message || "Failed to submit request." });
      }
    } catch {
      setMsg({ type: "error", text: "Network error submitting recruiter verification." });
    } finally {
      setSubmittingRecruiter(false);
    }
  };

  return (
    <div className="space-y-4">
      {msg && (
        <div
          className={`p-3.5 rounded-xl text-xs font-semibold ${
            msg.type === "success"
              ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800"
              : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-200 border border-red-200 dark:border-red-800"
          }`}
        >
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Company Verification Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold">
                Organization Verification
              </span>
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                  company.verification === "VERIFIED"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : company.verification === "PENDING"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                    : company.verification === "REJECTED"
                    ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                }`}
              >
                {company.verification}
              </span>
            </div>

            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-2">
              {company.name}
            </h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              {company.verification === "VERIFIED" &&
                "Your organization is verified. All published job listings display the official verified trust badge."}
              {company.verification === "PENDING" &&
                "Company documentation has been submitted and is currently in the administrator moderation queue."}
              {company.verification === "UNVERIFIED" &&
                "Your organization is unverified. Submitting official credentials elevates applicant trust and unlocks direct job publications."}
              {company.verification === "REJECTED" &&
                "The organization verification request was not approved. Review credentials and resubmit."}
            </p>
          </div>

          <div>
            {company.verification === "UNVERIFIED" || company.verification === "REJECTED" ? (
              canManageCompany ? (
                <button
                  type="button"
                  disabled={submittingCompany}
                  onClick={handleRequestCompanyVerify}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition disabled:opacity-50"
                >
                  {submittingCompany ? "Submitting Request..." : "Request Company Verification"}
                </button>
              ) : (
                <span className="text-[11px] text-zinc-400 italic">
                  Company verification can be requested by Owner or Administrator.
                </span>
              )
            ) : null}
          </div>
        </div>

        {/* Recruiter Identity Verification Card */}
        <div className="p-5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-zinc-500 font-bold">
                Recruiter Authorization
              </span>
              <span
                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                  membership.verificationStatus === "VERIFIED"
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                    : membership.verificationStatus === "PENDING"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300"
                    : membership.verificationStatus === "REJECTED"
                    ? "bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300"
                }`}
              >
                {membership.verificationStatus}
              </span>
            </div>

            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-2">
              Identity Verification ({membership.membershipRole})
            </h3>
            <p className="text-xs text-zinc-500 mt-1 leading-relaxed">
              {membership.verificationStatus === "VERIFIED" &&
                "Your personal recruiter identity is verified. You are authorized to submit jobs for moderation and manage applicants."}
              {membership.verificationStatus === "PENDING" &&
                "Your recruiter identity verification is currently awaiting review by the platform moderation team."}
              {membership.verificationStatus === "UNVERIFIED" &&
                "Your personal recruiter identity is unverified. Request verification to publish jobs under this organization."}
              {membership.verificationStatus === "REJECTED" &&
                `Verification rejected: ${membership.rejectionReason || "Please verify credentials and resubmit."}`}
            </p>
          </div>

          <div>
            {membership.verificationStatus === "UNVERIFIED" || membership.verificationStatus === "REJECTED" ? (
              <button
                type="button"
                disabled={submittingRecruiter}
                onClick={handleRequestRecruiterVerify}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition disabled:opacity-50"
              >
                {submittingRecruiter ? "Submitting Request..." : "Request Recruiter Verification"}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
