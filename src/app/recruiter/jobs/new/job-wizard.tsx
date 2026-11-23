"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface JobWizardProps {
  categories: CategoryOption[];
  company: {
    id: string;
    name: string;
    slug: string;
  };
}

export default function JobWizard({ categories, company }: JobWizardProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  // Step 1: Basic Information
  const [detailedTitle, setDetailedTitle] = useState("");
  const [title, setTitle] = useState("");
  const [role, setRole] = useState("Engineer");
  const [categoryId, setCategoryId] = useState(categories[0]?.id || "");
  const [employmentType, setEmploymentType] = useState<"FULL_TIME" | "PART_TIME" | "CONTRACT" | "INTERNSHIP">("FULL_TIME");
  const [experienceLevel, setExperienceLevel] = useState<"FRESHER" | "EXPERIENCED">("EXPERIENCED");
  const [experienceYears, setExperienceYears] = useState("");
  const [location, setLocation] = useState("");

  // Step 2: Description & Qualifications
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [qualifications, setQualifications] = useState("");
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>([]);

  // Step 3: Compensation
  const [salaryPeriod, setSalaryPeriod] = useState<"MONTHLY" | "YEARLY" | "HOURLY" | "NOT_DISCLOSED">("MONTHLY");
  const [salaryCurrency, setSalaryCurrency] = useState("INR");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");

  // Step 4: Application Method
  const [applicationMethod, setApplicationMethod] = useState<"INTERNAL" | "EXTERNAL" | "EMAIL">("INTERNAL");
  const [allowGuestApply, setAllowGuestApply] = useState(true);
  const [applicationUrl, setApplicationUrl] = useState("");
  const [applicationEmail, setApplicationEmail] = useState("");
  const [deadline, setDeadline] = useState("");

  // Step Navigation & Validation
  function addSkill() {
    const trimmed = skillInput.trim();
    if (trimmed && !skills.includes(trimmed)) {
      setSkills([...skills, trimmed]);
      setSkillInput("");
    }
  }

  function removeSkill(skillToRemove: string) {
    setSkills(skills.filter((s) => s !== skillToRemove));
  }

  function validateStep(s: number): boolean {
    setError(null);
    if (s === 1) {
      if (!detailedTitle.trim() || detailedTitle.trim().length < 3) {
        setError("Detailed job title is required (min 3 characters).");
        return false;
      }
      if (!categoryId) {
        setError("Please select a job category.");
        return false;
      }
      if (!location.trim()) {
        setError("Location is required (e.g. 'San Francisco, CA' or 'Remote').");
        return false;
      }
    } else if (s === 2) {
      if (!shortDescription.trim() || shortDescription.trim().length > 500) {
        setError("Short summary is required (max 500 characters).");
        return false;
      }
      if (!description.trim() || description.trim().length < 10) {
        setError("Detailed job description is required (min 10 characters).");
        return false;
      }
    } else if (s === 3) {
      if (salaryMin && salaryMax && Number(salaryMin) > Number(salaryMax)) {
        setError("Minimum compensation cannot exceed maximum compensation.");
        return false;
      }
    } else if (s === 4) {
      if (applicationMethod === "EXTERNAL") {
        if (!applicationUrl.trim()) {
          setError("External application URL is required.");
          return false;
        }
        try {
          const u = applicationUrl.startsWith("http") ? applicationUrl : `https://${applicationUrl}`;
          new URL(u);
        } catch {
          setError("Please provide a valid application URL.");
          return false;
        }
      } else if (applicationMethod === "EMAIL") {
        if (!applicationEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicationEmail.trim())) {
          setError("Please provide a valid application contact email address.");
          return false;
        }
      }
    }
    return true;
  }

  function nextStep() {
    if (validateStep(step)) {
      setStep((prev) => Math.min(5, prev + 1));
    }
  }

  function prevStep() {
    setError(null);
    setStep((prev) => Math.max(1, prev - 1));
  }

  async function handleFinalSubmit(publishStatus: "DRAFT" | "PUBLISHED") {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3) || !validateStep(4)) {
      return;
    }

    setLoading(true);
    setError(null);

    const effectiveTitle = (title.trim() || detailedTitle.trim()).slice(0, 37);
    const effectiveDetailedTitle = detailedTitle.trim().slice(0, 250);

    const payload = {
      title: effectiveTitle,
      detailedTitle: effectiveDetailedTitle,
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
      status: publishStatus,
    };

    try {
      const res = await fetch("/api/recruiter/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to create job posting.");
      }

      router.push("/recruiter/jobs");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create job posting.";
      setError(msg);
      setLoading(false);
    }
  }

  const selectedCategoryName = categories.find((c) => c.id === categoryId)?.name || "Not specified";

  return (
    <div className="space-y-8">
      {/* Step Progress Bar */}
      <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
            Step {step} of 5
          </span>
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {step === 1 && "Basic Information"}
            {step === 2 && "Description & Skills"}
            {step === 3 && "Compensation"}
            {step === 4 && "Application Pipeline"}
            {step === 5 && "Review & Publish"}
          </span>
        </div>

        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-2 rounded-full transition-colors ${
                s <= step
                  ? "bg-blue-600 dark:bg-blue-500"
                  : "bg-zinc-200 dark:bg-zinc-800"
              }`}
            />
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300 flex items-start gap-3">
          <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">{error}</div>
        </div>
      )}

      {/* Step 1: Basic Information */}
      {step === 1 && (
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Basic Job Information
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              Define the primary job title, functional role, department category, and workplace location.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Detailed Title */}
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
                onChange={(e) => {
                  setDetailedTitle(e.target.value);
                  if (!title || title.length < 35) {
                    setTitle(e.target.value.slice(0, 37));
                  }
                }}
                placeholder="e.g. Senior Full Stack Engineer (Next.js & Cloud Architecture)"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Short Title for Cards */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Card Short Title (Display Label)
                </label>
                <span className="text-xs text-zinc-400">{title.length}/37</span>
              </div>
              <input
                type="text"
                maxLength={37}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Senior Full Stack Engineer"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-zinc-400">Condensed version for compact cards (max 37 chars).</p>
            </div>

            {/* Functional Role */}
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
                placeholder="e.g. Engineer, Designer"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-zinc-400">Short role classification tag (max 20 chars).</p>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Job Category <span className="text-red-500">*</span>
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

            {/* Employment Type */}
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

            {/* Location */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Job Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={150}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. San Francisco, CA / Remote"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Experience Level & Years */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Experience Level <span className="text-red-500">*</span>
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
      )}

      {/* Step 2: Description & Skills */}
      {step === 2 && (
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Description & Requirements
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              Provide an engaging summary, comprehensive responsibilities, and key candidate skills.
            </p>
          </div>

          <div className="space-y-6">
            {/* Short Description */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Short Excerpt / Teaser <span className="text-red-500">*</span>
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
                placeholder="A compelling 1-2 sentence overview for job cards and search engine snippets."
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>

            {/* Detailed Description */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Full Job Description <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={8}
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed duties, responsibilities, project scope, team background, and requirements (markdown supported)..."
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>

            {/* Qualifications */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Minimum Educational / Professional Qualifications
              </label>
              <input
                type="text"
                value={qualifications}
                onChange={(e) => setQualifications(e.target.value)}
                placeholder="e.g. B.S. in Computer Science or equivalent practical industry experience"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Skills Chip Input */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Required Technical & Soft Skills
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
                  placeholder="e.g. React, TypeScript, GraphQL (press Add or Enter)"
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
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-300"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => removeSkill(skill)}
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
      )}

      {/* Step 3: Compensation */}
      {step === 3 && (
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Compensation & Salary Details
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              Transparent pay ranges significantly boost high-quality application submissions.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* Pay Frequency */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Pay Schedule / Period
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

            {/* Currency */}
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

            {/* Minimum Salary */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Minimum Compensation
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                disabled={salaryPeriod === "NOT_DISCLOSED"}
                value={salaryMin}
                onChange={(e) => setSalaryMin(e.target.value)}
                placeholder="e.g. 500000"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>

            {/* Maximum Salary */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Maximum Compensation
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                disabled={salaryPeriod === "NOT_DISCLOSED"}
                value={salaryMax}
                onChange={(e) => setSalaryMax(e.target.value)}
                placeholder="e.g. 900000"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Application Pipeline */}
      {step === 4 && (
        <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
          <div>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              Application Routing & Configuration
            </h2>
            <p className="text-sm text-zinc-500 mt-1">
              Select how candidates apply: on-platform application, external career portal link, or direct email.
            </p>
          </div>

          {/* Application Method Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => setApplicationMethod("INTERNAL")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                applicationMethod === "INTERNAL"
                  ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/20"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-3.5 h-3.5 rounded-full border-2 ${
                  applicationMethod === "INTERNAL" ? "border-blue-600 bg-blue-600" : "border-zinc-400"
                }`} />
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">JobPortal Internal</span>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Collect structured candidate applications and resumes directly inside your ATS dashboard.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setApplicationMethod("EXTERNAL")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                applicationMethod === "EXTERNAL"
                  ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/20"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-3.5 h-3.5 rounded-full border-2 ${
                  applicationMethod === "EXTERNAL" ? "border-blue-600 bg-blue-600" : "border-zinc-400"
                }`} />
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">External Career URL</span>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Direct visitors directly to your corporate ATS (Workday, Greenhouse, Lever, etc.).
              </p>
            </button>

            <button
              type="button"
              onClick={() => setApplicationMethod("EMAIL")}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                applicationMethod === "EMAIL"
                  ? "border-blue-600 bg-blue-50/50 dark:bg-blue-950/20"
                  : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300"
              }`}
            >
              <div className="flex items-center gap-2">
                <div className={`w-3.5 h-3.5 rounded-full border-2 ${
                  applicationMethod === "EMAIL" ? "border-blue-600 bg-blue-600" : "border-zinc-400"
                }`} />
                <span className="font-bold text-sm text-zinc-900 dark:text-zinc-100">Email Submission</span>
              </div>
              <p className="text-xs text-zinc-500 mt-2">
                Applicants submit resumes via a dedicated mailto routing address.
              </p>
            </button>
          </div>

          {/* Conditional Options */}
          {applicationMethod === "INTERNAL" && (
            <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 flex items-center justify-between gap-4">
              <div>
                <div className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                  Allow Guest Apply Modal Flow
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  Unauthenticated visitors see an inline authentication modal then instantly continue application.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowGuestApply}
                  onChange={(e) => setAllowGuestApply(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-zinc-300 peer-focus:outline-hidden rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
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
                placeholder="https://company.greenhouse.io/jobs/12345"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-zinc-400">
                Visitors clicking Apply will be redirected here and an outbound click will be recorded.
              </p>
            </div>
          )}

          {applicationMethod === "EMAIL" && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Application Routing Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={applicationEmail}
                onChange={(e) => setApplicationEmail(e.target.value)}
                placeholder="careers@yourcompany.com"
                className="w-full px-4 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Application Deadline */}
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
            <p className="text-xs text-zinc-400">
              After this date, the job is marked as expired and no longer accepts candidate submissions.
            </p>
          </div>
        </div>
      )}

      {/* Step 5: Review & Publish */}
      {step === 5 && (
        <div className="space-y-6">
          <div className="p-6 sm:p-8 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-200 dark:border-zinc-800">
              <div>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                  Review & Final Approval
                </span>
                <h2 className="text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 mt-1">
                  {detailedTitle || "Untitled Position"}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-500 mt-2">
                  <span>{company.name}</span>
                  <span>•</span>
                  <span>{location}</span>
                  <span>•</span>
                  <span className="capitalize">{employmentType.replace("_", " ").toLowerCase()}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                  {applicationMethod} Method
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {selectedCategoryName}
                </span>
              </div>
            </div>

            {/* Compensation summary */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50">
              <div>
                <div className="text-xs text-zinc-400">Compensation</div>
                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {salaryPeriod === "NOT_DISCLOSED"
                    ? "Not Disclosed"
                    : `${salaryCurrency} ${salaryMin || "0"} - ${salaryMax || "Negotiable"} / ${salaryPeriod.toLowerCase()}`}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-400">Experience</div>
                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {experienceLevel === "FRESHER" ? "Fresher" : `${experienceYears || "Any"} yrs exp`}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-400">Deadline</div>
                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
                  {deadline || "No deadline"}
                </div>
              </div>
              <div>
                <div className="text-xs text-zinc-400">Routing</div>
                <div className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mt-0.5 truncate">
                  {applicationMethod === "INTERNAL" ? "Internal ATS" : applicationMethod === "EXTERNAL" ? applicationUrl : applicationEmail}
                </div>
              </div>
            </div>

            {/* Teaser */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1">Overview Summary</h3>
              <p className="text-sm text-zinc-700 dark:text-zinc-300">{shortDescription}</p>
            </div>

            {/* Skills */}
            {skills.length > 0 && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Required Skills</h3>
                <div className="flex flex-wrap gap-1.5">
                  {skills.map((s) => (
                    <span key={s} className="px-2.5 py-0.5 rounded-md text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Description Preview */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">Detailed Description</h3>
              <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap font-sans">
                {description}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wizard Footer Controls */}
      <div className="flex items-center justify-between pt-4">
        {step > 1 ? (
          <button
            type="button"
            onClick={prevStep}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-sm transition-colors"
          >
            ← Back
          </button>
        ) : (
          <Link
            href="/recruiter/jobs"
            className="px-5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-semibold text-sm transition-colors"
          >
            Cancel
          </Link>
        )}

        <div className="flex items-center gap-3">
          {step < 5 ? (
            <button
              type="button"
              onClick={nextStep}
              className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors shadow-xs"
            >
              Continue to Step {step + 1} →
            </button>
          ) : (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleFinalSubmit("DRAFT")}
                className="px-5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 font-semibold text-sm transition-colors disabled:opacity-50"
              >
                Save as Draft
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleFinalSubmit("PUBLISHED")}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors shadow-xs disabled:opacity-50 inline-flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  "Publish Job Immediately 🚀"
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
