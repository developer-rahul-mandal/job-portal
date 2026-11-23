import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import PublicNav from "@/components/public/public-nav";
import PublicFooter from "@/components/public/public-footer";

interface CategoryDetailPageProps {
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

export async function generateMetadata({ params }: CategoryDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!slug) return { title: "Category Not Found — JobPortal" };

  const category = await prisma.category.findUnique({
    where: { slug },
    select: {
      name: true,
      description: true,
      isActive: true,
    },
  });

  if (!category || !category.isActive) {
    return { title: "Category Not Found — JobPortal" };
  }

  const title = `${category.name} Jobs & Career Opportunities — JobPortal`;
  const description =
    category.description ||
    `Browse open ${category.name} positions and job vacancies from verified employers on JobPortal.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
    },
  };
}

export default async function CategoryDetailPage({ params, searchParams }: CategoryDetailPageProps) {
  const user = await getServerSession();
  const { slug } = await params;
  const search = await searchParams;

  if (!slug?.trim()) {
    notFound();
  }

  const now = new Date();

  const category = await prisma.category.findUnique({
    where: { slug },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      isActive: true,
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

  if (!category || !category.isActive) {
    notFound();
  }

  const page = Math.max(1, Number.parseInt(search.page || "1", 10) || 1);
  const limit = 10;
  const skip = (page - 1) * limit;

  const jobWhere = {
    categoryId: category.id,
    status: "PUBLISHED" as const,
    OR: [{ deadline: null }, { deadline: { gt: now } }],
  };

  const [jobs, totalJobs, otherCategories] = await Promise.all([
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
        company: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            location: true,
            verification: true,
          },
        },
      },
    }),
    prisma.job.count({ where: jobWhere }),
    prisma.category.findMany({
      where: {
        isActive: true,
        id: { not: category.id },
      },
      take: 6,
      orderBy: { sortOrder: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
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
  ]);

  const totalPages = Math.ceil(totalJobs / limit);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <PublicNav user={user} />

      {/* Header Banner */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <nav className="text-xs text-zinc-500 mb-4">
            <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link href="/categories" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Categories
            </Link>
            <span className="mx-2">/</span>
            <span className="text-zinc-900 dark:text-zinc-100 font-medium">{category.name}</span>
          </nav>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                    {category.name} Jobs
                  </h1>
                  <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">
                    {totalJobs} Active {totalJobs === 1 ? "Job Opening" : "Job Openings"}
                  </span>
                </div>
              </div>

              {category.description && (
                <p className="mt-3 text-xs sm:text-sm text-zinc-600 dark:text-zinc-400 max-w-2xl leading-relaxed">
                  {category.description}
                </p>
              )}
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <Link
                href={`/jobs?category=${category.id}`}
                className="inline-flex items-center px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
              >
                Open in Search & Filter
                <svg className="w-4 h-4 ml-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Job Feed */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Available Positions ({totalJobs})
              </h2>
              <span className="text-xs text-zinc-400">Showing latest published</span>
            </div>

            {jobs.length === 0 ? (
              <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center shadow-sm">
                <div className="w-14 h-14 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-4">
                  <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">No active jobs in this category</h3>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-2">
                  There are currently no open positions listed under &quot;{category.name}&quot;. Try exploring other categories or view all jobs.
                </p>
                <div className="mt-6 flex justify-center gap-3">
                  <Link
                    href="/jobs"
                    className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white transition shadow-sm"
                  >
                    Browse All Jobs
                  </Link>
                  <Link
                    href="/categories"
                    className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 transition"
                  >
                    All Categories
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
                          <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-xl bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-lg font-bold text-zinc-600 dark:text-zinc-300 overflow-hidden shrink-0">
                              {job.company.logo ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={job.company.logo} alt={job.company.name} className="w-full h-full object-cover" />
                              ) : (
                                job.company.name.charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <Link
                                href={`/jobs/${job.slug}`}
                                className="text-lg font-bold text-zinc-900 dark:text-zinc-50 hover:text-blue-600 dark:hover:text-blue-400 transition"
                              >
                                {job.title}
                              </Link>
                              <div className="flex items-center gap-2 mt-1">
                                <Link
                                  href={`/companies/${job.company.slug}`}
                                  className="text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:text-blue-600 dark:hover:text-blue-400"
                                >
                                  {job.company.name}
                                </Link>
                                {job.company.verification === "VERIFIED" && (
                                  <span className="inline-flex items-center text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                                    ✓ Verified
                                  </span>
                                )}
                              </div>
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

                        <div className="mt-3 flex flex-wrap items-center gap-2">
                          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            {EMPLOYMENT_TYPE_LABELS[job.employmentType] || job.employmentType}
                          </span>
                          <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                            {EXPERIENCE_LEVEL_LABELS[job.experienceLevel] || job.experienceLevel}
                          </span>
                          {skillsList.slice(0, 4).map((skill, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                            >
                              {skill}
                            </span>
                          ))}
                        </div>
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
                          href={`/categories/${category.slug}?page=${page - 1}`}
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
                          href={`/categories/${category.slug}?page=${page + 1}`}
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

          {/* Right Column: Other Categories */}
          <div className="space-y-6">
            <section className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                Other Popular Categories
              </h3>
              <div className="space-y-2.5">
                {otherCategories.map((other) => (
                  <Link
                    key={other.id}
                    href={`/categories/${other.slug}`}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800/60 transition group text-xs"
                  >
                    <span className="font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {other.name}
                    </span>
                    <span className="text-[11px] font-semibold text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-200">
                      {other._count.jobs} roles
                    </span>
                  </Link>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <Link
                  href="/categories"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
                >
                  View all categories →
                </Link>
              </div>
            </section>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
