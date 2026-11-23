import Link from "next/link";
import type { Metadata } from "next";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import PublicNav from "@/components/public/public-nav";
import PublicFooter from "@/components/public/public-footer";

export const metadata: Metadata = {
  title: "Job Categories & Industry Sectors — JobPortal",
  description: "Explore job openings by category, functional role, and technical specialization.",
};

interface CategoriesPageProps {
  searchParams: Promise<{
    q?: string;
  }>;
}

export default async function CategoriesPage({ searchParams }: CategoriesPageProps) {
  const user = await getServerSession();
  const params = await searchParams;
  const q = params.q?.trim() || "";

  const now = new Date();

  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
      ...(q
        ? {
            OR: [
              { name: { contains: q } },
              { description: { contains: q } },
            ],
          }
        : {}),
    },
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
  });

  const totalOpenings = categories.reduce((acc, cat) => acc + cat._count.jobs, 0);

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50">
      <PublicNav user={user} />

      {/* Header Banner */}
      <div className="bg-white dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="text-xs text-zinc-500 mb-2">
            <Link href="/" className="hover:text-zinc-900 dark:hover:text-zinc-100">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-zinc-900 dark:text-zinc-100 font-medium">Categories</span>
          </nav>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-2">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                Browse Job Categories
              </h1>
              <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                Discover {totalOpenings} open positions across {categories.length} industry categories and specializations.
              </p>
            </div>

            {/* Quick Search */}
            <form method="GET" action="/categories" className="flex items-center gap-2 max-w-sm w-full">
              <div className="relative flex-1">
                <input
                  type="text"
                  name="q"
                  defaultValue={q}
                  placeholder="Filter categories..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
              >
                Search
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Category Grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex-1 w-full">
        {categories.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-12 text-center shadow-sm">
            <div className="w-14 h-14 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-4">
              <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">No categories found</h3>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto mt-2">
              No categories matched your search &quot;{q}&quot;. Try clearing the filter or exploring all categories.
            </p>
            <div className="mt-6">
              <Link
                href="/categories"
                className="inline-flex items-center px-4 py-2 rounded-xl text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 transition"
              >
                View All Categories
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/categories/${category.slug}`}
                className="group bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 shadow-sm hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-105 transition shrink-0">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
                      {category._count.jobs} {category._count.jobs === 1 ? "role" : "roles"}
                    </span>
                  </div>

                  <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-50 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition mt-4">
                    {category.name}
                  </h2>

                  {category.description ? (
                    <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed">
                      {category.description}
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-zinc-400 italic">Explore current openings in {category.name}.</p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition">
                  <span>Explore Jobs</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
