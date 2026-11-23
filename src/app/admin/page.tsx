import LogoutButton from "@/components/auth/logout-button";
import { getServerSession } from "@/lib/auth/session";

export const metadata = {
  title: "Administration — JobPortal",
};

export default async function AdminPage() {
  const user = await getServerSession();

  return (
    <div className="min-h-screen p-8 bg-zinc-50 dark:bg-zinc-950">
      <div className="max-w-4xl mx-auto bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-8">
        <div className="flex items-center justify-between pb-6 border-b border-zinc-200 dark:border-zinc-800">
          <div>
            <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
              Admin Platform Console
            </h1>
            <p className="text-sm text-zinc-500 mt-1">
              Superuser: {user?.name || user?.email} (Role: {user?.role})
            </p>
          </div>
          <LogoutButton />
        </div>

        <div className="mt-8 p-6 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-sm text-zinc-600 dark:text-zinc-400">
          <p className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            Superuser Access Verified
          </p>
          <p>
            You have full administrative oversight. Company verification, job moderation queues, and platform analytics will be activated in Phase 8.
          </p>
        </div>
      </div>
    </div>
  );
}
