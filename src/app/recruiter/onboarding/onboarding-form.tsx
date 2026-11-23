"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type DiscoveredCompany = {
  id: string;
  name: string;
  slug: string;
  logo?: string | null;
  industry?: string | null;
  location?: string | null;
  website?: string | null;
  normalizedDomain?: string | null;
  verification: string;
  hasActiveMembership: boolean;
  hasPendingMembership: boolean;
  hasPendingJoinRequest: boolean;
};

export default function OnboardingForm() {
  const router = useRouter();

  const [mode, setMode] = useState<"register" | "join">("register");

  // Registration state
  const [name, setName] = useState("");
  const [industry, setIndustry] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [officialEmail, setOfficialEmail] = useState("");
  const [overview, setOverview] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [duplicateMatch, setDuplicateMatch] = useState<DiscoveredCompany | null>(null);

  // Discovery / Join state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<DiscoveredCompany[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [requestNotes, setRequestNotes] = useState("");
  const [selectedCompanyForJoin, setSelectedCompanyForJoin] = useState<DiscoveredCompany | null>(null);
  const [joinSubmitting, setJoinSubmitting] = useState(false);
  const [joinSuccessMessage, setJoinSuccessMessage] = useState<string | null>(null);

  // Search effect
  useEffect(() => {
    if (mode !== "join" || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/recruiter/company/discover?q=${encodeURIComponent(searchQuery.trim())}`);
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.data || []);
        }
      } catch (err) {
        console.error("Company search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, mode]);

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setDuplicateMatch(null);

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
        if (data.duplicateFound && data.existingCompany) {
          setDuplicateMatch(data.existingCompany);
          setErrorMessage(data.message || "An organization matching this domain already exists.");
        } else {
          setErrorMessage(data.message || "Failed to create company profile.");
        }
        return;
      }

      router.push("/recruiter/dashboard");
      router.refresh();
    } catch (err) {
      console.error("Onboarding submission error:", err);
      setErrorMessage("A network error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinRequestSubmit = async (companyId: string) => {
    setJoinSubmitting(true);
    setErrorMessage(null);
    try {
      const res = await fetch("/api/recruiter/company/join-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          notes: requestNotes.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Failed to submit join request.");
      } else {
        setJoinSuccessMessage(data.message || "Join request submitted successfully.");
        setSelectedCompanyForJoin(null);
        // Refresh search results
        if (searchQuery.trim().length >= 2) {
          const ref = await fetch(`/api/recruiter/company/discover?q=${encodeURIComponent(searchQuery.trim())}`);
          if (ref.ok) {
            const refData = await ref.json();
            setSearchResults(refData.data || []);
          }
        }
      }
    } catch (err) {
      console.error("Join request error:", err);
      setErrorMessage("Network error submitting join request.");
    } finally {
      setJoinSubmitting(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
      {/* Mode Switcher Tabs */}
      <div className="flex border-b border-zinc-200 dark:border-zinc-800">
        <button
          type="button"
          onClick={() => {
            setMode("register");
            setErrorMessage(null);
            setJoinSuccessMessage(null);
          }}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition -mb-px ${
            mode === "register"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          Register New Organization
        </button>
        <button
          type="button"
          onClick={() => {
            setMode("join");
            setErrorMessage(null);
            setJoinSuccessMessage(null);
          }}
          className={`pb-3 px-4 text-sm font-semibold border-b-2 transition -mb-px ${
            mode === "join"
              ? "border-blue-600 text-blue-600 dark:text-blue-400"
              : "border-transparent text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          }`}
        >
          Find & Join Existing Organization
        </button>
      </div>

      {joinSuccessMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs sm:text-sm text-emerald-800 dark:text-emerald-200 flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="font-semibold">{joinSuccessMessage}</p>
        </div>
      )}

      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs sm:text-sm text-red-700 dark:text-red-300">
          <p className="font-semibold">Action Required</p>
          <p className="mt-0.5">{errorMessage}</p>

          {duplicateMatch && (
            <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800/80 flex items-center justify-between gap-3">
              <div>
                <p className="font-medium text-xs text-red-900 dark:text-red-100">
                  Existing Organization: <strong>{duplicateMatch.name}</strong>
                </p>
                <p className="text-[11px] text-red-600 dark:text-red-400">
                  Avoid creating duplicates. Request to join the verified workspace instead.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCompanyForJoin(duplicateMatch);
                  setMode("join");
                }}
                className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs shadow-xs transition"
              >
                Request to Join Instead
              </button>
            </div>
          )}
        </div>
      )}

      {mode === "register" ? (
        <form onSubmit={handleRegisterSubmit} className="space-y-6">
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
      ) : (
        <div className="space-y-6">
          <div>
            <label htmlFor="search" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Search Organization by Name or Website Domain
            </label>
            <div className="relative">
              <input
                id="search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type at least 2 characters (e.g., Acme, google.com)..."
                className="w-full px-3.5 py-2.5 text-sm rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {isSearching && (
                <div className="absolute right-3.5 top-3">
                  <svg className="w-4 h-4 animate-spin text-zinc-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
              )}
            </div>
          </div>

          {selectedCompanyForJoin && (
            <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Request to Join: {selectedCompanyForJoin.name}
                  </h4>
                  <p className="text-xs text-zinc-500">
                    {selectedCompanyForJoin.normalizedDomain || selectedCompanyForJoin.location || "Organization Workspace"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedCompanyForJoin(null)}
                  className="text-xs text-zinc-500 hover:text-zinc-700 underline"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1">
                  Optional note to administrators
                </label>
                <textarea
                  rows={2}
                  maxLength={500}
                  value={requestNotes}
                  onChange={(e) => setRequestNotes(e.target.value)}
                  placeholder="e.g. Hi, I'm the new technical recruiter joining the team."
                  className="w-full px-3 py-2 text-xs rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={joinSubmitting}
                  onClick={() => handleJoinRequestSubmit(selectedCompanyForJoin.id)}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition disabled:opacity-50"
                >
                  {joinSubmitting ? "Submitting Request..." : "Submit Join Request"}
                </button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-wider text-zinc-400 font-semibold">
              Matching Organizations ({searchResults.length})
            </h4>

            {searchResults.length === 0 ? (
              <div className="text-center py-8 text-zinc-400 text-xs">
                {searchQuery.trim().length < 2
                  ? "Enter a company name or domain above to search existing organizations."
                  : "No organizations found. You can switch to the 'Register New Organization' tab to create it."}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {searchResults.map((company) => (
                  <div
                    key={company.id}
                    className="p-3.5 rounded-xl border border-zinc-200 dark:border-zinc-800 flex items-center justify-between gap-3 hover:border-zinc-300 dark:hover:border-zinc-700 transition"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 flex items-center justify-center font-bold text-sm shrink-0">
                        {company.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={company.logo} alt={company.name} className="w-full h-full object-cover rounded-xl" />
                        ) : (
                          company.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                            {company.name}
                          </p>
                          {company.verification === "VERIFIED" ? (
                            <span className="text-[10px] text-emerald-600 font-semibold">✓ Verified</span>
                          ) : (
                            <span className="text-[10px] text-zinc-400">Unverified</span>
                          )}
                        </div>
                        <p className="text-xs text-zinc-500 truncate">
                          {company.normalizedDomain || company.website || company.location || company.industry || "Organization"}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0">
                      {company.hasActiveMembership ? (
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 text-xs font-semibold">
                          Active Member
                        </span>
                      ) : company.hasPendingJoinRequest ? (
                        <span className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 text-xs font-medium">
                          Request Pending
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCompanyForJoin(company);
                            setErrorMessage(null);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition"
                        >
                          Request to Join
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
