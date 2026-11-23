import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getServerSession();

  if (!user) {
    redirect("/login?redirect=/admin");
  }

  // Cross-role boundary enforcement:
  // Only users with explicit ADMIN privileges can access administrative routes.
  if (user.role !== "ADMIN") {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
