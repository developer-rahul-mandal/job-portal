import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import PublicNav from "@/components/public/public-nav";
import PublicFooter from "@/components/public/public-footer";
import JobApplyButton from "@/components/public/job-apply-button";

interface JobDetailsPageProps {
  params: Promise<{ slug: string }>;
}

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
};

const EXPERIENCE_LEVEL_LABELS: Record<string, string> = {
  ENTRY_LEVEL: "Entry Level / Fresher",
  MID_LEVEL: "Mid Level",
  SENIOR_LEVEL: "Senior Level",
  LEAD: "Team Lead",
  EXECUTIVE: "Executive / Director",
};

function formatSalary(min: unknown, max: unknown, currency: string, period: string): string | null {
  if (!min && !max) return null;
  const curr = currency || "INR";
  const numMin = min ? Number(min).toLocaleString() : null;
  const numMax = max ? Number(max).toLocaleString() : null;

  let text = "";
  if (numMin && numMax) text = `${curr} ${numMin} – ${numMax}`;
  else if (numMin) text = `From ${curr} ${numMin}`;
  else if (numMax) text = `Up to ${curr} ${numMax}`;

  if (period && period !== "NOT_DISCLOSED") {
    text += ` / ${period.toLowerCase()}`;
  }
  return text;
}

export async function generateMetadata({ params }: JobDetailsPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!slug) return { title: "Job Not Found — JobPortal" };

  const job = await prisma.job.findUnique({
    where: { slug },
    select: {
      title: true,
      shortDescription: true,
      metaTitle: true,
      metaDescription: true,
      company: { select: { name: true, logo: true } },
    },
  });

  if (!job) return { title: "Job Not Found — JobPortal" };

  const title = job.metaTitle || `${job.title} at ${job.company.name} — JobPortal`;
  const description = job.metaDescription || job.shortDescription || `Apply for ${job.title} at ${job.company.name}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: job.company.logo ? [{ url: job.company.logo }] : [],
    },
  };
}

export default async function JobDetailsPage({ params }: JobDetailsPageProps) {
  const { slug } = await params;

  if (!slug?.trim()) {
    notFound();
  }

  const user = await getServerSession();
  const now = new Date();

  const job = await prisma.job.findUnique({
    where: {
      slug: slug.trim(),
    },
    include: {
      company: true,
      category: true,
    },
  });

  // Verify job is active, published, and not expired
  if (!job || job.status !== "PUBLISHED") {
    notFound();
  }

  if (job.deadline && job.deadline <= now) {
    notFound();
  }

  const salaryStr = formatSalary(
    job.salaryMin,
    job.salaryMax,
    job.salaryCurrency,
    job.salaryPeriod
  );

  // Parse structured skills
  const skillsList: string[] = Array.isArray(job.skills)
    ? (job.skills as unknown[]).map((s) => String(s)).filter(Boolean)
    : [];

  // Parse qualifications if array
  const qualificationsList: string[] = Array.isArray(job.qualifications)
    ? (job.qualifications as unknown[]).map((q) => String(q)).filter(Boolean)
    : [];

  // JSON-LD schema for Google Jobs
  const jsonLd = {
    "@context": "https://schema.org/",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: job.publishedAt ? job.publishedAt.toISOString() : job.createdAt.toISOString(),
    validThrough: job.deadline ? job.deadline.toISOString() : undefined,
    employmentType: job.employmentType,
    hiringOrganization: {
      "@type": "Organization",
      name: job.company.name,
      sameAs: job.company.website || undefined,
      logo: job.company.logo || undefined,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location,
      },
    },
    baseSalary:
      job.salaryMin || job.salaryMax
        ? {
            "@type": "MonetaryAmount",
            currency: job.salaryCurrency || "INR",
            value: {
              "@type": "QuantitativeValue",
              minValue: job.salaryMin ? Number(job.salaryMin) : undefined,
              maxValue: job.salaryMax ? Number(job.salaryMax) : undefined,
              unitText: job.salaryPeriod || "MONTH",
            },
          }
        : undefined,
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      {/* Google Jobs Schema */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PublicNav user={user} />

      {/* Breadcrumb Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="text-xs text-zinc-500 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Home
            </Link>
            <span>/</span>
            <Link href="/jobs" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Jobs
            </Link>
            <span>/</span>
            {job.category && (
              <>
                <Link
                  href={`/jobs?category=${encodeURIComponent(job.category.name)}`}
                  className="hover:text-zinc-900 dark:hover:text-zinc-100"
                >
                  {job.category.name}
                </Link>
                <span>/</span>
              </>
            )}
            <span className="text-zinc-900 dark:text-zinc-100 font-medium truncate max-w-xs">
              {job.title}
            </span>
          </nav>
        </div>
      </div>

      {/* Main Job Hero Header */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="flex items-start gap-4 sm:gap-5 min-w-0">
              {job.company.logo ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={job.company.logo}
                  alt={job.company.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-contain bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 shrink-0 p-1"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xl flex items-center justify-center shrink-0">
                  {job.company.name.slice(0, 2).toUpperCase()}
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/companies/${job.company.slug}`}
                    className="text-sm sm:text-base font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-950 dark:hover:text-white transition-colors"
                  >
                    {job.company.name}
                  </Link>
                  {job.company.verification === "VERIFIED" && (
                    <span className="text-blue-600 dark:text-blue-400 text-xs shrink-0" title="Verified Employer">
                      ✓ Verified
                    </span>
                  )}
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 mt-1">
                  {job.title}
                </h1>

                <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-zinc-500 mt-3">
                  <span className="flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
                    📍 {job.location}
                  </span>
                  <span>•</span>
                  <span className="font-medium text-zinc-700 dark:text-zinc-300">
                    💼 {EMPLOYMENT_TYPE_LABELS[job.employmentType] || job.employmentType}
                  </span>
                  {salaryStr && (
                    <>
                      <span>•</span>
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                        💰 {salaryStr}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Apply Action CTA */}
            <div className="flex flex-col sm:items-end justify-center gap-2 pt-2 md:pt-0">
              <JobApplyButton
                job={{
                  id: job.id,
                  slug: job.slug,
                  title: job.title,
                  applicationMethod: job.applicationMethod,
                  applicationUrl: job.applicationUrl,
                  applicationEmail: job.applicationEmail,
                  allowGuestApply: job.allowGuestApply,
                }}
                currentUser={
                  user
                    ? {
                        id: user.id,
                        email: user.email,
                        name: user.name,
                      }
                    : null
                }
              />
              <span className="text-[11px] text-zinc-400">
                {job.applicationMethod === "EXTERNAL"
                  ? "Redirects to external employer application"
                  : "Direct application managed on JobPortal"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Body: Two Column Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Specification Column */}
          <main className="lg:col-span-2 space-y-8">
            {/* Overview / Short Description */}
            {job.shortDescription && (
              <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8">
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                  Role Overview
                </h2>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {job.shortDescription}
                </p>
              </section>
            )}

            {/* Detailed Description */}
            <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-4">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                Job Description
              </h2>
              <div className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap space-y-4">
                {job.description}
              </div>
            </section>

            {/* Qualifications / Requirements */}
            {qualificationsList.length > 0 && (
              <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-4">
                <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                  Qualifications & Requirements
                </h2>
                <ul className="list-disc pl-5 space-y-2 text-sm text-zinc-700 dark:text-zinc-300">
                  {qualificationsList.map((item, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {/* Required Skills */}
            {skillsList.length > 0 && (
              <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-3">
                <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  Key Skills & Technologies
                </h2>
                <div className="flex flex-wrap gap-2 pt-1">
                  {skillsList.map((skillItem, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-lg text-xs font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700"
                    >
                      {skillItem}
                    </span>
                  ))}
                </div>
              </section>
            )}
          </main>

          {/* Sidebar Column */}
          <aside className="lg:col-span-1 space-y-6">
            {/* Quick Facts Card */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 pb-2 border-b border-zinc-100 dark:border-zinc-800">
                Job Overview
              </h3>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-zinc-400 block">Experience Level</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 block">
                    {EXPERIENCE_LEVEL_LABELS[job.experienceLevel] || job.experienceLevel}
                    {job.experienceYears ? ` (${job.experienceYears} years)` : ""}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-400 block">Employment Type</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 block">
                    {EMPLOYMENT_TYPE_LABELS[job.employmentType] || job.employmentType}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-400 block">Location</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 block">
                    {job.location}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-400 block">Category</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 block">
                    {job.category?.name || "General"}
                  </span>
                </div>

                <div>
                  <span className="text-zinc-400 block">Published</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5 block">
                    {job.publishedAt
                      ? new Date(job.publishedAt).toLocaleDateString("en-US", {
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Recently"}
                  </span>
                </div>

                {job.deadline && (
                  <div>
                    <span className="text-zinc-400 block">Application Deadline</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400 mt-0.5 block">
                      {new Date(job.deadline).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Company Card */}
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                {job.company.logo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={job.company.logo}
                    alt={job.company.name}
                    className="w-12 h-12 rounded-xl object-contain bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 p-0.5"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-sm flex items-center justify-center">
                    {job.company.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    {job.company.name}
                  </h4>
                  <p className="text-xs text-zinc-500">
                    {job.company.industry || job.company.location || "Verified Organization"}
                  </p>
                </div>
              </div>

              {job.company.overview && (
                <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed line-clamp-4">
                  {job.company.overview}
                </p>
              )}

              <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
                {job.company.website && (
                  <a
                    href={job.company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-blue-600 dark:text-blue-400 hover:underline truncate"
                  >
                    Visit website ↗
                  </a>
                )}
                <Link
                  href={`/companies/${job.company.slug}`}
                  className="block text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:underline"
                >
                  View all company jobs →
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
