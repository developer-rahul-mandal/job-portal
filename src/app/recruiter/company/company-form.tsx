"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface CompanyFormProps {
  company: {
    id: string;
    name: string;
    slug: string;
    overview: string | null;
    industry: string | null;
    logo: string | null;
    website: string | null;
    officialEmail: string | null;
    location: string | null;
    verification: string;
  };
  canEdit: boolean;
}

export default function CompanyForm({ company, canEdit }: CompanyFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [name, setName] = useState(company.name || "");
  const [industry, setIndustry] = useState(company.industry || "");
  const [location, setLocation] = useState(company.location || "");
  const [website, setWebsite] = useState(company.website || "");
  const [officialEmail, setOfficialEmail] = useState(company.officialEmail || "");
  const [overview, setOverview] = useState(company.overview || "");

  // Logo upload state
  const [logoVersion, setLogoVersion] = useState(0);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Form submit state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const logoUrl = company.logo
    ? `/api/companies/${company.slug}/logo?v=${logoVersion}`
    : null;

  async function handleLogoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
      setError("Please select a JPEG, PNG, or WebP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Logo file size must be less than 5MB.");
      return;
    }

    setError(null);
    setSuccess(null);
    setLogoUploading(true);

    // Show temporary preview
    const previewUrl = URL.createObjectURL(file);
    setLogoPreview(previewUrl);

    try {
      const formData = new FormData();
      formData.append("logo", file);

      const res = await fetch("/api/recruiter/company/logo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to upload logo.");
      }

      setLogoVersion(Date.now());
      setSuccess("Company logo updated successfully.");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to upload logo.";
      setError(msg);
      setLogoPreview(null);
    } finally {
      setLogoUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;

    setError(null);
    setSuccess(null);

    if (name.trim().length < 2) {
      setError("Company name must be at least 2 characters.");
      return;
    }

    if (overview.length > 300) {
      setError("Overview cannot exceed 300 characters.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch("/api/recruiter/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          industry: industry.trim() || null,
          location: location.trim() || null,
          website: website.trim() || null,
          officialEmail: officialEmail.trim() || null,
          overview: overview.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to update company.");
      }

      setSuccess("Company details updated successfully.");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update company.";
      setError(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300 flex items-start gap-3">
          <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">{error}</div>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-sm text-emerald-700 dark:text-emerald-300 flex items-start gap-3">
          <svg className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div className="flex-1">{success}</div>
        </div>
      )}

      {!canEdit && (
        <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-sm text-amber-800 dark:text-amber-300 flex items-center gap-3">
          <svg className="w-5 h-5 shrink-0 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>You have Recruiter (read-only) permissions. Only Company Owners and Admins can modify corporate details and upload branding assets.</span>
        </div>
      )}

      {/* Brand & Logo Section */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Company Logo & Branding</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Upload your official company emblem. Formats: JPEG, PNG, WebP (max 5MB).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-28 h-28 rounded-2xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 overflow-hidden bg-zinc-50 dark:bg-zinc-800 flex items-center justify-center shrink-0">
            {logoPreview || logoUrl ? (
              <Image
                src={logoPreview || (logoUrl as string)}
                alt={`${company.name} logo`}
                fill
                className="object-contain p-2"
                unoptimized
              />
            ) : (
              <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">
                {company.name.slice(0, 2).toUpperCase()}
              </span>
            )}
            {logoUploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-semibold backdrop-blur-xs">
                Uploading...
              </div>
            )}
          </div>

          <div className="space-y-3 flex-1 text-center sm:text-left">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleLogoSelect}
              className="hidden"
              disabled={!canEdit || logoUploading}
            />

            {canEdit && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={logoUploading}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 font-semibold text-sm transition-colors shadow-xs disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {logoUrl ? "Change Company Logo" : "Upload Company Logo"}
              </button>
            )}

            <p className="text-xs text-zinc-500">
              Square aspect ratio (1:1) recommended. Vector formats (SVG) are rejected for security.
            </p>
          </div>
        </div>
      </div>

      {/* Company Details Form */}
      <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Corporate Details</h2>
          <p className="text-sm text-zinc-500 mt-1">
            Keep your public profile and job postings accurate for candidates.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Company Name */}
          <div className="sm:col-span-2 space-y-2">
            <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Company Legal Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={!canEdit}
              maxLength={150}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Corporation"
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>

          {/* Industry */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Industry
            </label>
            <input
              type="text"
              disabled={!canEdit}
              maxLength={100}
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              placeholder="e.g. Software & Cloud, FinTech"
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Headquarters / Primary Location
            </label>
            <input
              type="text"
              disabled={!canEdit}
              maxLength={150}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. San Francisco, CA / Remote"
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>

          {/* Website */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Official Website
            </label>
            <input
              type="url"
              disabled={!canEdit}
              maxLength={500}
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>

          {/* Official Email */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Official Contact Email
            </label>
            <input
              type="email"
              disabled={!canEdit}
              maxLength={254}
              value={officialEmail}
              onChange={(e) => setOfficialEmail(e.target.value)}
              placeholder="recruiting@example.com"
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
            />
          </div>

          {/* Overview */}
          <div className="sm:col-span-2 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Company Overview
              </label>
              <span className={`text-xs ${overview.length > 280 ? "text-amber-500 font-bold" : "text-zinc-400"}`}>
                {overview.length} / 300
              </span>
            </div>
            <textarea
              rows={4}
              disabled={!canEdit}
              maxLength={300}
              value={overview}
              onChange={(e) => setOverview(e.target.value)}
              placeholder="A brief introduction to your company, mission, and culture (max 300 characters)."
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-60 resize-none"
            />
            <p className="text-xs text-zinc-400">
              This overview is displayed on candidate job detail pages and search results.
            </p>
          </div>
        </div>

        {canEdit && (
          <div className="flex justify-end pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors shadow-xs disabled:opacity-50"
            >
              {saving ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Saving Changes...
                </>
              ) : (
                "Save Company Profile"
              )}
            </button>
          </div>
        )}
      </form>
    </div>
  );
}
