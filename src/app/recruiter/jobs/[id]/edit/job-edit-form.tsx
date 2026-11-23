"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface JobData {
  id: string;
  slug: string;
  title: string;
  detailedTitle: string;
  role: string;
  categoryId: string;
  employmentType: "FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP";
  experienceLevel: "FRESHER" | "EXPERIENCED";
  experienceYears: number | null;
  location: string;
  shortDescription: string;
  description: string;
  qualifications: string | null;
  skills: string[] | null;
  salaryMin: number | null;
  salaryMax: number | null;
  salaryCurrency: string;
  salaryPeriod: "MONTHLY" | "YEARLY" | "HOURLY" | "NOT_DISCLOSED";
  applicationMethod: "INTERNAL" | "EXTERNAL" | "EMAIL";
  applicationUrl: string | null;
  applicationEmail: string | null;
  allowGuestApply: boolean;
  deadline: string | null;
  status: "DRAFT" | "PUBLISHED" | "CLOSED";
}

interface JobEditFormProps {
  job: JobData;
  categories: CategoryOption[];
}

export default function JobEditForm({ job, categories }: JobEditFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [detailedTitle, setDetailedTitle] = useState(job.detailedTitle || "");
  const [title, setTitle] = useState(job.title || "");
  const [role, setRole] = useState(job.role || "Engineer");
  const [categoryId, setCategoryId] = useState(job.categoryId || categories[0]?.id || "");
  const [employmentType, setEmploymentType] = useState(job.employmentType || "FULL_TIME");
  const [experienceLevel, setExperienceLevel] = useState(job.experienceLevel || "EXPERIENCED");
  const [experienceYears, setExperienceYears] = useState(
    job.experienceYears !== null ? String(job.experienceYears) : ""
  );
  const [location, setLocation] = useState(job.location || "");

  const [shortDescription, setShortDescription] = useState(job.shortDescription || "");
  const [description, setDescription] = useState(job.description || "");
  const [qualifications, setQualifications] = useState(job.qualifications || "");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>(Array.isArray(job.skills) ? job.skills : []);

  const [salaryPeriod, setSalaryPeriod] = useState(job.salaryPeriod || "MONTHLY");
  const [salaryCurrency, setSalaryCurrency] = useState(job.salaryCurrency || "INR");
  const [salaryMin, setSalaryMin] = useState(job.salaryMin !== null ? String(job.salaryMin) : "");
  const [salaryMax, setSalaryMax] = useState(job.salaryMax !== null ? String(job.salaryMax) : "");

  const [applicationMethod, setApplicationMethod] = useState(job.applicationMethod || "INTERNAL");
  const [allowGuestApply, setAllowGuestApply] = useState(job.allowGuestApply);
  const [applicationUrl, setApplicationUrl] = useState(job.applicationUrl || "");
  const [applicationEmail, setApplicationEmail] = useState(job.applicationEmail || "");
  const [deadline, setDeadline] = useState(
    job.deadline ? new Date(job.deadline).toISOString().split("T")[0] : ""
  );
  const [status, setStatus] = useState<"DRAFT" | "PUBLISHED" | "CLOSED">(
    job.status === "PUBLISHED" || job.status === "CLOSED" ? job.status : "DRAFT"
  );

  function addSkill() {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput("");
    }
  }

  function removeSkill(toRemove: string) {
    setSkills(skills.filter((s) => s !== toRemove));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!detailedTitle.trim() || detailedTitle.trim().length < 3) {
      setError("Detailed job title is required (min 3 characters).");
      return;
    }

    if (!shortDescription.trim() || shortDescription.trim().length > 500) {
      setError("Short excerpt is required (max 500 characters).");
      return;
    }

    if (!description.trim() || description.trim().length < 10) {
      setError("Full job description is required (min 10 characters).");
      return;
    }

    if (salaryMin && salaryMax && Number(salaryMin) > Number(salaryMax)) {
      setError("Minimum salary cannot exceed maximum salary.");
      return;
    }

    if (applicationMethod === "EXTERNAL") {
      if (!applicationUrl.trim()) {
        setError("External application URL is required.");
        return;
      }
      try {
        const u = applicationUrl.startsWith("http") ? applicationUrl : `https://${applicationUrl}`;
        new URL(u);
      } catch {
        setError("Invalid application URL format.");
        return;
      }
    } else if (applicationMethod === "EMAIL") {
      if (!applicationEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicationEmail.trim())) {
        setError("Invalid application contact email format.");
        return;
      }
    }

    setLoading(true);

    const payload = {
      title: (title.trim() || detailedTitle.trim()).slice(0, 37),
      detailedTitle: detailedTitle.trim().slice(0, 250),
      role: role.trim().slice(0, 20),
      categoryId,
      employmentType,
      experienceLevel,
      experienceYears: experienceYears ? Number(experienceYears) : null,
      location: location.trim(),
      shortDescription: shortDescription.trim(),
      description: description.trim(),
      qualifications: qualifications.trim() || null,
      skills: skills.length > 0 ? skills : null,
      salaryMin: salaryMin ? Number(salaryMin) : null,
      salaryMax: salaryMax ? Number(salaryMax) : null,
      salaryCurrency,
      salaryPeriod,
      applicationMethod,
      applicationUrl: applicationMethod === "EXTERNAL" ? applicationUrl.trim() : null,
      applicationEmail: applicationMethod === "EMAIL" ? applicationEmail.trim() : null,
      allowGuestApply: applicationMethod === "INTERNAL" ? allowGuestApply : true,
      deadline: deadline ? deadline : null,
      status,
    };

    try {
      const res = await fetch(`/api/recruiter/jobs/${job.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to update job posting.");
      }

      setSuccess("Job posting updated successfully.");
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update job posting.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
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

      {/* Section 1: Basic Info & Status */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Job Status & Visibility</h2>
            <p className="text-sm text-zinc-500">Control publication status and application intake.</p>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase">Status:</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="px-3.5 py-1.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 font-bold text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="sm:col-span-2 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Full Job Title <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-zinc-400">{detailedTitle.length}/250</span>
            </div>
            <input
              type="text"
              required
              maxLength={250}
              value={detailedTitle}
              onChange={(e) => setDetailedTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Card Short Title
              </label>
              <span className="text-xs text-zinc-400">{title.length}/37</span>
            </div>
            <input
              type="text"
              maxLength={37}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Role Tag <span className="text-red-500">*</span>
              </label>
              <span className="text-xs text-zinc-400">{role.length}/20</span>
            </div>
            <input
              type="text"
              required
              maxLength={20}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Category <span className="text-red-500">*</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Employment Type <span className="text-red-500">*</span>
            </label>
            <select
              value={employmentType}
              onChange={(e) => setEmploymentType(e.target.value as typeof employmentType)}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="FULL_TIME">Full Time</option>
              <option value="PART_TIME">Part Time</option>
              <option value="CONTRACT">Contract</option>
              <option value="INTERNSHIP">Internship</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Location <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              maxLength={150}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Experience Level
            </label>
            <div className="grid grid-cols-2 gap-3">
              <select
                value={experienceLevel}
                onChange={(e) => setExperienceLevel(e.target.value as typeof experienceLevel)}
                className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              >
                <option value="FRESHER">Fresher</option>
                <option value="EXPERIENCED">Experienced</option>
              </select>
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                placeholder="Min Years"
                className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Section 2: Description & Skills */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Job Description & Qualifications</h2>
          <p className="text-sm text-zinc-500">Provide complete specifications and candidate qualifications.</p>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Short Summary (Excerpt) <span className="text-red-500">*</span>
              </label>
              <span className={`text-xs ${shortDescription.length > 480 ? "text-amber-500 font-bold" : "text-zinc-400"}`}>
                {shortDescription.length}/500
              </span>
            </div>
            <textarea
              rows={3}
              required
              maxLength={500}
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Detailed Description (Markdown supported) <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={8}
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Qualifications & Credentials
            </label>
            <input
              type="text"
              value={qualifications}
              onChange={(e) => setQualifications(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Skills */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Required Skills
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSkill();
                  }
                }}
                placeholder="e.g. Next.js, TypeScript (press Enter)"
                className="flex-1 px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <button
                type="button"
                onClick={addSkill}
                className="px-4 py-2 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-semibold hover:bg-zinc-800 transition-colors"
              >
                Add Skill
              </button>
            </div>

            {skills.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {skills.map((s) => (
                  <span
                    key={s}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-300"
                  >
                    {s}
                    <button
                      type="button"
                      onClick={() => removeSkill(s)}
                      className="hover:text-red-500 transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Section 3: Compensation */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Compensation & Pay Structure</h2>
          <p className="text-sm text-zinc-500">Update salary ranges and payment frequencies.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Pay Schedule
            </label>
            <select
              value={salaryPeriod}
              onChange={(e) => setSalaryPeriod(e.target.value as typeof salaryPeriod)}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              <option value="MONTHLY">Monthly</option>
              <option value="YEARLY">Yearly (Annual)</option>
              <option value="HOURLY">Hourly</option>
              <option value="NOT_DISCLOSED">Not Disclosed / Negotiable</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Currency
            </label>
            <select
              value={salaryCurrency}
              onChange={(e) => setSalaryCurrency(e.target.value)}
              disabled={salaryPeriod === "NOT_DISCLOSED"}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              <option value="INR">INR (₹)</option>
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Minimum Salary
            </label>
            <input
              type="number"
              min="0"
              disabled={salaryPeriod === "NOT_DISCLOSED"}
              value={salaryMin}
              onChange={(e) => setSalaryMin(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Maximum Salary
            </label>
            <input
              type="number"
              min="0"
              disabled={salaryPeriod === "NOT_DISCLOSED"}
              value={salaryMax}
              onChange={(e) => setSalaryMax(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            />
          </div>
        </div>
      </div>

      {/* Section 4: Application Pipeline */}
      <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
        <div>
          <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Application Pipeline</h2>
          <p className="text-sm text-zinc-500">Configure how applicants submit credentials.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button
            type="button"
            onClick={() => setApplicationMethod("INTERNAL")}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              applicationMethod === "INTERNAL"
                ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/20"
                : "border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Internal ATS</div>
            <p className="text-xs text-zinc-500 mt-1">Direct JobPortal resume submissions.</p>
          </button>

          <button
            type="button"
            onClick={() => setApplicationMethod("EXTERNAL")}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              applicationMethod === "EXTERNAL"
                ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/20"
                : "border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">External URL</div>
            <p className="text-xs text-zinc-500 mt-1">Redirect to corporate career site.</p>
          </button>

          <button
            type="button"
            onClick={() => setApplicationMethod("EMAIL")}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              applicationMethod === "EMAIL"
                ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/20"
                : "border-zinc-200 dark:border-zinc-800"
            }`}
          >
            <div className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Email Submission</div>
            <p className="text-xs text-zinc-500 mt-1">Direct email submissions.</p>
          </button>
        </div>

        {applicationMethod === "INTERNAL" && (
          <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                Allow Guest Apply Modal Flow
              </div>
              <div className="text-xs text-zinc-500 mt-0.5">
                Guests can sign up or log in through an inline modal without losing application flow.
              </div>
            </div>
            <input
              type="checkbox"
              checked={allowGuestApply}
              onChange={(e) => setAllowGuestApply(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded border-zinc-300"
            />
          </div>
        )}

        {applicationMethod === "EXTERNAL" && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              External Application URL <span className="text-red-500">*</span>
            </label>
            <input
              type="url"
              required
              value={applicationUrl}
              onChange={(e) => setApplicationUrl(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        {applicationMethod === "EMAIL" && (
          <div className="space-y-2">
            <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Application Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              required
              value={applicationEmail}
              onChange={(e) => setApplicationEmail(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Application Deadline (Optional)
          </label>
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            className="px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Form Submission Actions */}
      <div className="flex items-center justify-between pt-4">
        <Link
          href="/recruiter/jobs"
          className="px-5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-sm transition-colors"
        >
          Cancel & Return
        </Link>

        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors shadow-xs disabled:opacity-50 inline-flex items-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Saving Changes...
            </>
          ) : (
            "Save Job Changes"
          )}
        </button>
      </div>
    </form>
  );
}
