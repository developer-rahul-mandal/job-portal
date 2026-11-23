import React from "react";
import Link from "next/link";

interface AuthCardProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}

export function AuthCard({ title, subtitle, children }: AuthCardProps) {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="mb-8 text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-2 font-bold text-xl tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          <div className="h-8 w-8 rounded bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center text-white dark:text-zinc-900 font-extrabold text-sm">
            JP
          </div>
          <span>JobPortal</span>
        </Link>
        <h1 className="mt-6 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          {title}
        </h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          {subtitle}
        </p>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 sm:p-8 shadow-sm">
        {children}
      </div>
    </div>
  );
}
