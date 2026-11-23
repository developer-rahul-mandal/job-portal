"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function OnboardingForm() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [officialEmail, setOfficialEmail] = useState("");
  const [overview, setOverview] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2 || cleanName.length > 150) {
      setErrorMessage("Company name must be between 2 and 150 characters.");
      return;
    }

    if (overview.trim().length > 300) {
      setErrorMessage("Company overview cannot exceed 300 characters.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/recruiter/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: cleanName,
          industry: industry.trim() || null,
          location: location.trim() || null,
          website: website.trim() || null,
          officialEmail: officialEmail.trim() || null,
          overview: overview.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Failed to create company profile.");
        return;
      }

      // Success -> navigate to dashboard
      router.push("/recruiter/dashboard");
      router.refresh();
    } catch (err) {
      console.error("Onboarding submission error:", err);
      setErrorMessage("A network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs sm:text-sm text-red-700 dark:text-red-300">
          <p className="font-semibold">Unable to complete setup</p>
          <p className="mt-0.5">{errorMessage}</p>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
            Company / Organization Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Acme Corporation"
            className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="industry" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Industry Sector
            </label>
            <input
              id="industry"
              type="text"
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Fintech, SaaS, Healthcare"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="location" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Headquarters Location
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Bengaluru, India"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="website" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Official Website
            </label>
            <input
              id="website"
              type="url"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://acmecorp.com"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="officialEmail" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Corporate Contact Email
            </label>
            <input
              id="officialEmail"
              type="email"
              value={officialEmail}
              onChange={(e) => setOfficialEmail(e.target.value)}
              placeholder="careers@acmecorp.com"
              className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="overview" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
            Company Overview (max 300 characters)
          </label>
          <textarea
            id="overview"
            rows={3}
            maxLength={300}
            value={overview}
            onChange={(e) => setOverview(e.target.value)}
            placeholder="Brief description of your company, mission, and products..."
            className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-[11px] text-zinc-400 mt-1">
            {overview.length}/300 characters
          </p>
        </div>
      </div>

      <div className="p-4 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 text-xs text-blue-800 dark:text-blue-300 space-y-1">
        <p className="font-semibold">Verification & Ownership Terms:</p>
        <p>
          By creating this company profile, your account will be granted <strong>Owner</strong> privileges. Newly registered companies start with <strong>UNVERIFIED</strong> status until reviewed by platform moderation.
        </p>
      </div>

      <div className="pt-2 flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto px-7 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Setting Up Company...
            </>
          ) : (
            "Complete Company Setup"
          )}
        </button>
      </div>
    </form>
  );
}
