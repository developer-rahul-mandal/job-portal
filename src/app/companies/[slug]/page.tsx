import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import PublicNav from "@/components/public/public-nav";
import PublicFooter from "@/components/public/public-footer";

interface CompanyDetailPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
};

const EXPERIENCE_LEVEL_LABELS: Record<string, string> = {
  FRESHER: "Fresher",
  EXPERIENCED: "Experienced",
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

function formatRelativeTime(date: Date): string {
  const diffHours = Math.round((Date.now() - new Date(date).getTime()) / (1000 * 60 * 60));
  if (diffHours < 1) return "Just now";
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays === 1) return "1 day ago";
  if (diffDays < 30) return `${diffDays} days ago`;
  return new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export async function generateMetadata({ params }: CompanyDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!slug) return { title: "Company Not Found — JobPortal" };

  const company = await prisma.company.findUnique({
    where: { slug },
    select: {
      name: true,
      overview: true,
      industry: true,
      location: true,
      logo: true,
    },
  });

  if (!company) return { title: "Company Not Found — JobPortal" };

  const title = `${company.name} Careers & Open Positions — JobPortal`;
  const description =
    company.overview ||
    `Explore career opportunities, company information, and job openings at ${company.name}${company.location ? ` in ${company.location}` : ""}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: company.logo ? [{ url: company.logo }] : [],
    },
  };
}

export default async function CompanyDetailPage({ params, searchParams }: CompanyDetailPageProps) {
  const user = await getServerSession();
  const { slug } = await params;
  const search = await searchParams;

  if (!slug?.trim()) {
    notFound();
  }

  const now = new Date();

  const company = await prisma.company.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      overview: true,
      industry: true,
      logo: true,
      website: true,
      officialEmail: true,
      location: true,
      verification: true,
      rating: true,
      createdAt: true,
      _count: {
        select: {
          jobs: {
            where: {
              status: "PUBLISHED",
              OR: [{ deadline: null }, { deadline: { gt: now } }],
            },
          },
        },
      },
    },
  });

  if (!company) {
    notFound();
  }

  const page = Math.max(1, Number.parseInt(search.page || "1", 10) || 1);
  const limit = 10;
  const skip = (page - 1) * limit;

  const jobWhere = {
    companyId: company.id,
    status: "PUBLISHED" as const,
    OR: [{ deadline: null }, { deadline: { gt: now } }],
  };

  const [jobs, totalJobs] = await Promise.all([
    prisma.job.findMany({
      where: jobWhere,
      orderBy: { publishedAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        slug: true,
        title: true,
        shortDescription: true,
        location: true,
        employmentType: true,
        experienceLevel: true,
        experienceYears: true,
        salaryMin: true,
        salaryMax: true,
        salaryCurrency: true,
        salaryPeriod: true,
        skills: true,
        publishedAt: true,
        deadline: true,
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    }),
    prisma.job.count({ where: jobWhere }),
  ]);

  const totalPages = Math.ceil(totalJobs / limit);

  // Safe external URL check
  const websiteUrl =
    company.website && (company.website.startsWith("http://") || company.website.startsWith("https://"))
      ? company.website
      : company.website
      ? `https://${company.website}`
      : null;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <PublicNav user={user} />

      {/* Header Banner */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="text-xs text-zinc-500 mb-6">
            <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link href="/companies" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Companies
            </Link>
            <span className="mx-2">/</span>
            <span className="text-zinc-900 dark:text-zinc-100 font-medium">{company.name}</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6">
            <div className="flex items-start gap-5">
              <div className="w-20 h-20 rounded-2xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-3xl font-bold text-zinc-600 dark:text-zinc-300 overflow-hidden shrink-0 shadow-sm">
                {company.logo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={company.logo} alt={company.name} className="w-full h-full object-cover" />
                ) : (
                  company.name.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {company.name}
                  </h1>
                  {company.verification === "VERIFIED" && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      <svg className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Verified Employer
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs sm:text-sm text-zinc-500 dark:text-zinc-400">
                  {company.industry && (
                    <span className="inline-flex items-center gap-1 font-medium text-zinc-700 dark:text-zinc-300">
                      <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      {company.industry}
                    </span>
                  )}
                  {company.location && (
                    <span className="inline-flex items-center gap-1">
                      <svg className="w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {company.location}
                    </span>
                  )}
                  {company.rating && (
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {Number(company.rating).toFixed(1)} Rating
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-medium">
                    <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    {company._count.jobs} Open {company._count.jobs === 1 ? "Position" : "Positions"}
                  </span>
                </div>
              </div>
            </div>

            {websiteUrl && (
              <div className="shrink-0">
                <a
                  href={websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-sm font-semibold transition"
                >
                  Visit Official Website
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Company Overview & Info */}
          <div className="space-y-6">
            <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mb-3">About {company.name}</h2>
              {company.overview ? (
                <p className="text-sm text-zinc-600 dark:text-zinc-400 whitespace-pre-line leading-relaxed">
                  {company.overview}
                </p>
              ) : (
                <p className="text-sm text-zinc-400 italic">No company overview provided.</p>
              )}
            </section>

            <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 border-b border-zinc-100 dark:border-zinc-800 pb-2">
                Company Details
              </h3>
              <dl className="text-xs space-y-3">
                {company.industry && (
                  <div>
                    <dt className="text-zinc-400 font-medium">Industry</dt>
                    <dd className="text-zinc-800 dark:text-zinc-200 font-medium text-sm mt-0.5">{company.industry}</dd>
                  </div>
                )}
                {company.location && (
                  <div>
                    <dt className="text-zinc-400 font-medium">Headquarters</dt>
                    <dd className="text-zinc-800 dark:text-zinc-200 font-medium text-sm mt-0.5">{company.location}</dd>
                  </div>
                )}
                {company.officialEmail && (
                  <div>
                    <dt className="text-zinc-400 font-medium">Contact Email</dt>
                    <dd className="text-zinc-800 dark:text-zinc-200 font-medium text-sm mt-0.5">
                      <a href={`mailto:${company.officialEmail}`} className="text-blue-600 dark:text-blue-400 hover:underline">
                        {company.officialEmail}
                      </a>
                    </dd>
                  </div>
                )}
                {websiteUrl && (
                  <div>
                    <dt className="text-zinc-400 font-medium">Website</dt>
                    <dd className="text-zinc-800 dark:text-zinc-200 font-medium text-sm mt-0.5 truncate">
                      <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">
                        {company.website}
                      </a>
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="text-zinc-400 font-medium">Member Since</dt>
                  <dd className="text-zinc-800 dark:text-zinc-200 font-medium text-sm mt-0.5">
                    {new Date(company.createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                  </dd>
                </div>
              </dl>
            </section>
          </div>

          {/* Right Column: Active Job Openings */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                  Open Positions ({totalJobs})
                </h2>
                <p className="text-xs text-zinc-500 mt-1">
                  All active openings directly posted by {company.name}
                </p>
              </div>

              <Link
                href={`/jobs?q=${encodeURIComponent(company.name)}`}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
              >
                Search in all jobs →
              </Link>
            </div>

            {jobs.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center shadow-sm">
                <div className="w-14 h-14 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-4">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">No active positions right now</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-2">
                  {company.name} does not have any publicly listed job vacancies today. Please check back later or explore other companies.
                </p>
                <div className="mt-6">
                  <Link
                    href="/jobs"
                    className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm"
                  >
                    Browse Other Jobs
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {jobs.map((job) => {
                  const salary = formatSalary(job.salaryMin, job.salaryMax, job.salaryCurrency, job.salaryPeriod);
                  const skillsList = Array.isArray(job.skills) ? (job.skills as string[]) : [];

                  return (
                    <div
                      key={job.id}
                      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:border-zinc-300 dark:hover:border-zinc-700 transition flex flex-col justify-between gap-4"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <Link
                              href={`/jobs/${job.slug}`}
                              className="text-lg font-bold text-zinc-900 dark:text-zinc-50 hover:text-blue-600 dark:hover:text-blue-400 transition"
                            >
                              {job.title}
                            </Link>
                            <div className="flex flex-wrap items-center gap-2 mt-2">
                              {job.category && (
                                <Link
                                  href={`/categories/${job.category.slug}`}
                                  className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 hover:underline"
                                >
                                  {job.category.name}
                                </Link>
                              )}
                              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                {EMPLOYMENT_TYPE_LABELS[job.employmentType] || job.employmentType}
                              </span>
                              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                {EXPERIENCE_LEVEL_LABELS[job.experienceLevel] || job.experienceLevel}
                              </span>
                            </div>
                          </div>

                          {salary && (
                            <span className="text-xs sm:text-sm font-semibold text-emerald-600 dark:text-emerald-400 shrink-0 text-right">
                              {salary}
                            </span>
                          )}
                        </div>

                        <p className="mt-3 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2">
                          {job.shortDescription}
                        </p>

                        {skillsList.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {skillsList.slice(0, 5).map((skill, idx) => (
                              <span
                                key={idx}
                                className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                              >
                                {skill}
                              </span>
                            ))}
                            {skillsList.length > 5 && (
                              <span className="text-[11px] px-1.5 py-0.5 text-zinc-400">
                                +{skillsList.length - 5} more
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <svg className="w-3.5 h-3.5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {job.location}
                          </span>
                          {job.publishedAt && (
                            <span>Posted {formatRelativeTime(job.publishedAt)}</span>
                          )}
                        </div>

                        <Link
                          href={`/jobs/${job.slug}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                        >
                          View Details
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  );
                })}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="pt-4 flex items-center justify-between text-xs">
                    <p className="text-zinc-500">
                      Page <span className="font-semibold text-zinc-900 dark:text-zinc-100">{page}</span> of{" "}
                      <span className="font-semibold text-zinc-900 dark:text-zinc-100">{totalPages}</span>
                    </p>
                    <div className="flex gap-2">
                      {page > 1 ? (
                        <Link
                          href={`/companies/${company.slug}?page=${page - 1}`}
                          className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium"
                        >
                          Previous
                        </Link>
                      ) : (
                        <span className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-300 dark:text-zinc-700 cursor-not-allowed">
                          Previous
                        </span>
                      )}
                      {page < totalPages ? (
                        <Link
                          href={`/companies/${company.slug}?page=${page + 1}`}
                          className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 font-medium"
                        >
                          Next
                        </Link>
                      ) : (
                        <span className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 text-zinc-300 dark:text-zinc-700 cursor-not-allowed">
                          Next
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
