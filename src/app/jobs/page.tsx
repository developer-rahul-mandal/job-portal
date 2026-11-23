import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@/generated/prisma/client";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import PublicNav from "@/components/public/public-nav";
import PublicFooter from "@/components/public/public-footer";

export const metadata: Metadata = {
  title: "Browse All Jobs — JobPortal",
  description: "Search and apply for active software engineering, product, and technology positions.",
};

const EMPLOYMENT_TYPES = [
  { value: "FULL_TIME", label: "Full-time" },
  { value: "PART_TIME", label: "Part-time" },
  { value: "CONTRACT", label: "Contract" },
  { value: "INTERNSHIP", label: "Internship" },
] as const;

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

interface JobsPageProps {
  searchParams: Promise<{
    q?: string;
    location?: string;
    category?: string;
    company?: string;
    type?: string;
    skill?: string;
    page?: string;
    limit?: string;
  }>;
}

export default async function JobsPage({ searchParams }: JobsPageProps) {
  const user = await getServerSession();
  const params = await searchParams;

  const q = params.q?.trim() || "";
  const location = params.location?.trim() || "";
  const category = params.category?.trim() || "";
  const company = params.company?.trim() || "";
  const type = params.type?.trim() || "";
  const skill = params.skill?.trim() || "";

  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const limit = Math.min(30, Math.max(1, Number.parseInt(params.limit || "10", 10) || 10));
  const skip = (page - 1) * limit;

  const now = new Date();

  // Search conditions across terms
  const searchTerms = q.split(/\s+/).filter(Boolean).slice(0, 8);
  const searchConditions: Prisma.JobWhereInput[] = searchTerms.map((term) => ({
    OR: [
      { title: { contains: term } },
      { shortDescription: { contains: term } },
      { description: { contains: term } },
      { role: { contains: term } },
      { location: { contains: term } },
      { company: { name: { contains: term } } },
      { category: { name: { contains: term } } },
      { skills: { array_contains: [term] } },
      { keywords: { array_contains: [term] } },
    ],
  }));

  const where: Prisma.JobWhereInput = {
    status: "PUBLISHED",
    AND: [
      ...searchConditions,
      ...(location ? [{ location: { contains: location } }] : []),
      ...(category ? [{ category: { name: { contains: category } } }] : []),
      ...(company ? [{ company: { name: { contains: company } } }] : []),
      ...(type ? [{ employmentType: type as (typeof EMPLOYMENT_TYPES)[number]["value"] }] : []),
      ...(skill ? [{ skills: { array_contains: [skill] } }] : []),
      {
        OR: [{ deadline: null }, { deadline: { gt: now } }],
      },
    ],
  };

  const [jobs, totalJobs, allCategories] = await Promise.all([
    prisma.job.findMany({
      where,
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      skip,
      take: limit,
      select: {
        id: true,
        slug: true,
        title: true,
        shortDescription: true,
        role: true,
        location: true,
        employmentType: true,
        experienceLevel: true,
        experienceYears: true,
        salaryMin: true,
        salaryMax: true,
        salaryCurrency: true,
        salaryPeriod: true,
        skills: true,
        applicationMethod: true,
        publishedAt: true,
        deadline: true,
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            verification: true,
            location: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    }),

    prisma.job.count({ where }),

    prisma.category.findMany({
      where: { isActive: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true, slug: true },
    }),
  ]);

  const totalPages = Math.ceil(totalJobs / limit);

  // Helper to construct pagination query string
  const createPageUrl = (targetPage: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (location) sp.set("location", location);
    if (category) sp.set("category", category);
    if (company) sp.set("company", company);
    if (type) sp.set("type", type);
    if (skill) sp.set("skill", skill);
    sp.set("page", targetPage.toString());
    return `/jobs?${sp.toString()}`;
  };

  const hasActiveFilters = Boolean(q || location || category || company || type || skill);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <PublicNav user={user} />

      {/* Header Banner */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="text-xs text-zinc-500 mb-2">
            <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Home
            </Link>{" "}
            / <span className="text-zinc-900 dark:text-zinc-100 font-medium">Jobs</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Explore Open Positions
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Browse {totalJobs} active {totalJobs === 1 ? "opening" : "openings"} across engineering and product teams.
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <aside className="lg:col-span-1 space-y-6">
            <form
              method="GET"
              action="/jobs"
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 space-y-5"
            >
              <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  Filter Jobs
                </h3>
                {hasActiveFilters && (
                  <Link
                    href="/jobs"
                    className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Reset all
                  </Link>
                )}
              </div>

              {/* Keyword Search */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Keywords
                </label>
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="e.g. React, Engineer"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Location
                </label>
                <input
                  type="text"
                  name="location"
                  defaultValue={location}
                  placeholder="e.g. Remote or Bengaluru"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Category
                </label>
                <select
                  name="category"
                  defaultValue={category}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="">All Categories</option>
                  {allCategories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Employment Type */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Employment Type
                </label>
                <select
                  name="type"
                  defaultValue={type}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                >
                  <option value="">All Employment Types</option>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Skill Filter */}
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
                  Skill
                </label>
                <input
                  type="text"
                  name="skill"
                  defaultValue={skill}
                  placeholder="e.g. TypeScript, Docker"
                  className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold text-xs hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm cursor-pointer"
              >
                Apply Filters
              </button>
            </form>
          </aside>

          {/* Job Listings Column */}
          <main className="lg:col-span-3 space-y-4">
            {/* Results Counter & Active Pills */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-4 border border-zinc-200 dark:border-zinc-800 rounded-xl">
              <span className="text-xs text-zinc-500">
                Showing <strong className="text-zinc-900 dark:text-zinc-100">{jobs.length}</strong> of{" "}
                <strong className="text-zinc-900 dark:text-zinc-100">{totalJobs}</strong> jobs
              </span>

              {hasActiveFilters && (
                <div className="flex flex-wrap items-center gap-1.5">
                  {q && (
                    <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                      Keyword: {q}
                    </span>
                  )}
                  {location && (
                    <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                      Location: {location}
                    </span>
                  )}
                  {category && (
                    <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                      {category}
                    </span>
                  )}
                  {type && (
                    <span className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px] font-medium text-zinc-700 dark:text-zinc-300">
                      {type}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Job Cards */}
            {jobs.length > 0 ? (
              <div className="space-y-3">
                {jobs.map((job) => {
                  const salaryStr = formatSalary(
                    job.salaryMin,
                    job.salaryMax,
                    job.salaryCurrency,
                    job.salaryPeriod
                  );

                  return (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.slug}`}
                      className="block p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all group"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5 min-w-0">
                          {job.company.logo ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={job.company.logo}
                              alt={job.company.name}
                              className="w-12 h-12 rounded-lg object-contain bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-sm flex items-center justify-center shrink-0">
                              {job.company.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}

                          <div className="min-w-0">
                            <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block truncate">
                              {job.company.name}
                            </span>
                            <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1 mt-0.5">
                              {job.title}
                            </h2>

                            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2 line-clamp-2 leading-relaxed">
                              {job.shortDescription}
                            </p>

                            <div className="flex flex-wrap items-center gap-1.5 mt-3">
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                {EMPLOYMENT_TYPES.find((t) => t.value === job.employmentType)?.label || job.employmentType}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                {job.location}
                              </span>
                              {job.category && (
                                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                                  {job.category.name}
                                </span>
                              )}
                              {job.applicationMethod === "EXTERNAL" && (
                                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                                  External Apply
                                </span>
                              )}
                              {job.applicationMethod === "INTERNAL" && (
                                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                                  Direct Apply
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-100 dark:border-zinc-800">
                          <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                            {salaryStr || "Undisclosed"}
                          </span>
                          <span className="text-xs text-zinc-400">
                            {job.publishedAt ? formatRelativeTime(job.publishedAt) : ""}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl mt-6">
                    {page > 1 ? (
                      <Link
                        href={createPageUrl(page - 1)}
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 transition-colors"
                      >
                        ← Previous
                      </Link>
                    ) : (
                      <span className="px-3.5 py-1.5 text-xs font-semibold text-zinc-300 dark:text-zinc-700 cursor-not-allowed">
                        ← Previous
                      </span>
                    )}

                    <span className="text-xs text-zinc-500">
                      Page <strong className="text-zinc-900 dark:text-zinc-100">{page}</strong> of{" "}
                      <strong className="text-zinc-900 dark:text-zinc-100">{totalPages}</strong>
                    </span>

                    {page < totalPages ? (
                      <Link
                        href={createPageUrl(page + 1)}
                        className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 transition-colors"
                      >
                        Next →
                      </Link>
                    ) : (
                      <span className="px-3.5 py-1.5 text-xs font-semibold text-zinc-300 dark:text-zinc-700 cursor-not-allowed">
                        Next →
                      </span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-12 text-center space-y-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                  No matching jobs found
                </h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  We could not find any active job openings matching your search criteria. Try removing or adjusting filters.
                </p>
                {hasActiveFilters && (
                  <div className="pt-2">
                    <Link
                      href="/jobs"
                      className="inline-flex px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors"
                    >
                      Clear all filters
                    </Link>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
