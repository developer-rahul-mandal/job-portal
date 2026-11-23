import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import PublicNav from "@/components/public/public-nav";
import PublicFooter from "@/components/public/public-footer";

export const metadata: Metadata = {
  title: "Company Directory — JobPortal",
  description: "Browse top technology employers and corporate partners hiring talent on JobPortal.",
};

interface CompaniesPageProps {
  searchParams: Promise<{
    q?: string;
    industry?: string;
    page?: string;
  }>;
}

export default async function CompaniesPage({ searchParams }: CompaniesPageProps) {
  const user = await getServerSession();
  const params = await searchParams;

  const q = params.q?.trim() || "";
  const industry = params.industry?.trim() || "";
  const page = Math.max(1, Number.parseInt(params.page || "1", 10) || 1);
  const limit = 12;
  const skip = (page - 1) * limit;

  const now = new Date();

  const where = {
    AND: [
      ...(q
        ? [
            {
              OR: [
                { name: { contains: q } },
                { overview: { contains: q } },
                { location: { contains: q } },
              ],
            },
          ]
        : []),
      ...(industry ? [{ industry: { contains: industry } }] : []),
    ],
  };

  const [companies, totalCompanies] = await Promise.all([
    prisma.company.findMany({
      where,
      orderBy: [{ verification: "desc" }, { name: "asc" }],
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        overview: true,
        industry: true,
        logo: true,
        location: true,
        verification: true,
        rating: true,
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

    prisma.company.count({ where }),
  ]);

  const totalPages = Math.ceil(totalCompanies / limit);

  const createPageUrl = (targetPage: number) => {
    const sp = new URLSearchParams();
    if (q) sp.set("q", q);
    if (industry) sp.set("industry", industry);
    sp.set("page", targetPage.toString());
    return `/companies?${sp.toString()}`;
  };

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
            / <span className="text-zinc-900 dark:text-zinc-100 font-medium">Companies</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Top Hiring Companies
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-1">
            Explore verified organizations, engineering cultures, and active vacancy postings.
          </p>

          {/* Search Form */}
          <form
            method="GET"
            action="/companies"
            className="mt-6 flex flex-col sm:flex-row gap-2 max-w-xl"
          >
            <input
              type="text"
              name="q"
              defaultValue={q}
              placeholder="Search companies by name or location..."
              className="flex-1 px-3.5 py-2 text-sm rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
            />
            <button
              type="submit"
              className="px-5 py-2 text-xs font-semibold rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm cursor-pointer"
            >
              Search
            </button>
            {q && (
              <Link
                href="/companies"
                className="px-3 py-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 self-center"
              >
                Clear
              </Link>
            )}
          </form>
        </div>
      </div>

      {/* Grid of Companies */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full flex-1">
        {companies.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {companies.map((comp) => (
                <Link
                  key={comp.id}
                  href={`/companies/${comp.slug}`}
                  className="p-6 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl hover:border-zinc-300 dark:hover:border-zinc-700 hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    <div className="flex items-start gap-4">
                      {comp.logo ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={comp.logo}
                          alt={comp.name}
                          className="w-14 h-14 rounded-xl object-contain bg-zinc-50 dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-800 p-1 shrink-0"
                        />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-base flex items-center justify-center shrink-0">
                          {comp.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {comp.name}
                          </h2>
                          {comp.verification === "VERIFIED" && (
                            <span className="text-blue-600 dark:text-blue-400 text-xs shrink-0" title="Verified Employer">
                              ✓
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-zinc-500 mt-0.5 truncate">
                          {comp.industry || "Technology"} {comp.location ? `• ${comp.location}` : ""}
                        </p>
                      </div>
                    </div>

                    {comp.overview && (
                      <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                        {comp.overview}
                      </p>
                    )}
                  </div>

                  <div className="mt-6 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs">
                    <span className="px-2 py-0.5 rounded-full font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                      {comp._count.jobs} {comp._count.jobs === 1 ? "live opening" : "live openings"}
                    </span>
                    <span className="text-blue-600 dark:text-blue-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                      View Jobs →
                    </span>
                  </div>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between p-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl mt-8">
                {page > 1 ? (
                  <Link
                    href={createPageUrl(page - 1)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
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
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100"
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
          </>
        ) : (
          <div className="p-12 text-center bg-white dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              No companies found
            </h3>
            <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
              No hiring organizations match your search keyword.
            </p>
            {q && (
              <Link
                href="/companies"
                className="mt-4 inline-flex px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
              >
                Clear Search
              </Link>
            )}
          </div>
        )}
      </div>

      <PublicFooter />
    </div>
  );
}
