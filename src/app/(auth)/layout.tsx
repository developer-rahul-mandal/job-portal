import React from "react";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col justify-between bg-zinc-50 dark:bg-zinc-950 px-4 py-8 sm:px-6 lg:px-8">
      <header className="w-full max-w-5xl mx-auto flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1.5 transition-colors"
        >
          <span aria-hidden="true">&larr;</span>
          <span>Back to Home</span>
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center my-8">
        {children}
      </main>

      <footer className="w-full max-w-5xl mx-auto text-center text-xs text-zinc-500 dark:text-zinc-500">
        &copy; {new Date().getFullYear()} JobPortal. All rights reserved. Secure passwordless authentication.
      </footer>
    </div>
  );
}
