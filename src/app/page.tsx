import Link from "next/link";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import PublicNav from "@/components/public/public-nav";
import PublicFooter from "@/components/public/public-footer";

export const metadata = {
  title: "JobPortal — Modern Tech Careers & Hiring Platform",
  description: "Discover curated engineering, product, and tech roles at high-growth startups and verified global organizations.",
};

const EMPLOYMENT_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
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

export default async function Home() {
  const user = await getServerSession();
  const now = new Date();

  const [featuredJobs, popularCategories, featuredCompanies, stats] = await Promise.all([
    // Latest 6 published active jobs
    prisma.job.findMany({
      where: {
        status: "PUBLISHED",
        OR: [{ deadline: null }, { deadline: { gt: now } }],
      },
      take: 6,
      orderBy: [{ publishedAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        shortDescription: true,
        role: true,
        location: true,
        employmentType: true,
        salaryMin: true,
        salaryMax: true,
        salaryCurrency: true,
        salaryPeriod: true,
        applicationMethod: true,
        publishedAt: true,
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

    // Top 8 active categories with active job count
    prisma.category.findMany({
      where: { isActive: true },
      take: 8,
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
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
    }),

    // Top 6 verified or featured companies with active job count
    prisma.company.findMany({
      take: 6,
      orderBy: [{ verification: "desc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
        overview: true,
        industry: true,
        logo: true,
        location: true,
        verification: true,
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
    }),

    // Platform live counters
    Promise.all([
      prisma.job.count({
        where: {
          status: "PUBLISHED",
          OR: [{ deadline: null }, { deadline: { gt: now } }],
        },
      }),
      prisma.company.count(),
      prisma.category.count({ where: { isActive: true } }),
    ]),
  ]);

  const [totalLiveJobs, totalCompanies, totalCategories] = stats;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <PublicNav user={user} />

      {/* Hero Search Section */}
      <section className="relative py-16 sm:py-24 bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700">
            <span>✨</span>
            <span>Over {totalLiveJobs} active career opportunities</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100 max-w-3xl mx-auto leading-tight">
            Find the right job that matches your skills & ambitions
          </h1>

          <p className="text-base sm:text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
            Discover roles across software development, product management, design, and data at verified technology companies.
          </p>

          {/* Search Form */}
          <form
            action="/jobs"
            method="GET"
            className="mt-8 p-2.5 sm:p-3 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-2xl shadow-xl max-w-4xl mx-auto flex flex-col sm:flex-row gap-2 sm:gap-3"
          >
            <div className="flex-1 flex items-center gap-2.5 px-3 py-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700/80">
              <svg className="w-5 h-5 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                name="q"
                placeholder="Job title, keywords, or company..."
                className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
              />
            </div>

            <div className="sm:w-1/3 flex items-center gap-2.5 px-3 py-2 bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-700/80">
              <svg className="w-5 h-5 text-zinc-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <input
                type="text"
                name="location"
                placeholder="City or Remote..."
                className="w-full bg-transparent text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="px-7 py-3 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 font-semibold text-sm hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm shrink-0 cursor-pointer"
            >
              Search Jobs
            </button>
          </form>

          {/* Quick Category Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-xs text-zinc-500">
            <span>Popular searches:</span>
            {popularCategories.slice(0, 5).map((cat) => (
              <Link
                key={cat.id}
                href={`/jobs?category=${encodeURIComponent(cat.name)}`}
                className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white transition-colors"
              >
                {cat.name}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Counter Bar */}
      <section className="bg-zinc-100/70 dark:bg-zinc-900/40 border-b border-zinc-200 dark:border-zinc-800 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-4 text-center divide-x divide-zinc-200 dark:divide-zinc-800">
            <div>
              <p className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
                {totalLiveJobs}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">Live Openings</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
                {totalCompanies}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">Hiring Companies</p>
            </div>
            <div>
              <p className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100">
                {totalCategories}
              </p>
              <p className="text-xs text-zinc-500 mt-0.5">Job Specializations</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Jobs Section */}
      <section className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Latest Published Jobs
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 mt-1">
              Hand-picked verified opportunities from top engineering teams.
            </p>
          </div>
          <Link
            href="/jobs"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:underline"
          >
            <span>Browse all jobs</span>
            <span>→</span>
          </Link>
        </div>

        {featuredJobs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {featuredJobs.map((job) => {
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
                  className="group p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 block truncate">
                          {job.company.name}
                        </span>
                        <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1 mt-0.5">
                          {job.title}
                        </h3>
                      </div>

                      {job.company.logo ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={job.company.logo}
                          alt={job.company.name}
                          className="w-10 h-10 rounded-lg object-contain bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 shrink-0"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {job.company.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>

                    <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {job.shortDescription}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {EMPLOYMENT_TYPE_LABELS[job.employmentType] || job.employmentType}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {job.location}
                      </span>
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

                  <div className="mt-5 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                      {salaryStr || "Salary Undisclosed"}
                    </span>
                    <span className="text-zinc-400">
                      {job.publishedAt ? formatRelativeTime(job.publishedAt) : ""}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
            <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              No live job postings available right now
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Check back soon as employers post new positions regularly.
            </p>
          </div>
        )}
      </section>

      {/* Popular Categories Grid */}
      <section className="py-12 bg-white dark:bg-zinc-900 border-y border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                Explore by Specialization
              </h2>
              <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
                Target job roles by domain and category.
              </p>
            </div>
            <Link
              href="/categories"
              className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:underline"
            >
              All Categories →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {popularCategories.map((cat) => (
              <Link
                key={cat.id}
                href={`/jobs?category=${encodeURIComponent(cat.name)}`}
                className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30 hover:bg-white dark:hover:bg-zinc-800 transition-all group"
              >
                <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {cat.name}
                </h3>
                <p className="text-xs text-zinc-500 mt-1">
                  {cat._count.jobs} {cat._count.jobs === 1 ? "opening" : "openings"}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Companies Grid */}
      <section className="py-12 sm:py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
              Top Employers
            </h2>
            <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
              Verified corporate partners hiring talent through JobPortal.
            </p>
          </div>
          <Link
            href="/companies"
            className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:underline"
          >
            All Companies →
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {featuredCompanies.map((comp) => (
            <Link
              key={comp.id}
              href={`/companies/${comp.slug}`}
              className="p-5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start gap-3.5">
                {comp.logo ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={comp.logo}
                    alt={comp.name}
                    className="w-12 h-12 rounded-lg object-contain bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-sm flex items-center justify-center shrink-0">
                    {comp.name.slice(0, 2).toUpperCase()}
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {comp.name}
                    </h3>
                    {comp.verification === "VERIFIED" && (
                      <span className="text-blue-600 dark:text-blue-400 text-xs shrink-0" title="Verified Employer">
                        ✓
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-500 mt-0.5 truncate">
                    {comp.industry || comp.location || "Technology"}
                  </p>

                  <span className="inline-block mt-2 px-2 py-0.5 rounded text-[11px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                    {comp._count.jobs} {comp._count.jobs === 1 ? "job opening" : "job openings"}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Browse All Jobs Banner */}
      <section className="bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 py-12 px-4 sm:px-6 lg:px-8 text-center space-y-4">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Ready to discover your next challenge?
        </h2>
        <p className="text-sm text-zinc-400 dark:text-zinc-600 max-w-xl mx-auto">
          Explore hundreds of active opportunities or set up email alerts for new roles matching your profile.
        </p>
        <div className="pt-2">
          <Link
            href="/jobs"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-white text-zinc-900 dark:bg-zinc-900 dark:text-white font-semibold text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors shadow-md"
          >
            Explore All Open Roles →
          </Link>
        </div>
      </section>

      <PublicFooter />
    </div>
  );
}
