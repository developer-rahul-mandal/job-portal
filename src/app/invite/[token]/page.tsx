import Link from "next/link";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import InviteAction from "./invite-action";

export const metadata = {
  title: "Team Invitation — JobPortal",
};

export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await getServerSession();

  const invitation = await prisma.companyInvitation.findUnique({
    where: { token },
    include: {
      company: true,
      invitedBy: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  });

  if (!invitation) {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto text-xl font-bold">
            !
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Invitation Not Found</h1>
          <p className="text-sm text-zinc-500">
            This invitation link is invalid or has been revoked by the company administrator.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isExpired = invitation.expiresAt < new Date();
  if (isExpired || invitation.status !== "PENDING") {
    return (
      <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto text-xl font-bold">
            ✕
          </div>
          <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
            {invitation.status === "ACCEPTED" ? "Invitation Already Accepted" : "Invitation Expired"}
          </h1>
          <p className="text-sm text-zinc-500">
            {invitation.status === "ACCEPTED"
              ? "This invitation has already been accepted and activated."
              : "This invitation link has expired. Please ask your administrator to send a new invite."}
          </p>
          <div className="pt-2">
            <Link
              href="/recruiter/dashboard"
              className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition"
            >
              Open Recruiter Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-extrabold text-2xl mx-auto shadow-sm">
            {invitation.company.logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={invitation.company.logo}
                alt={invitation.company.name}
                className="w-full h-full object-cover rounded-2xl"
              />
            ) : (
              invitation.company.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-100">
              Join {invitation.company.name}
            </h1>
            <p className="text-xs text-zinc-500 mt-1">
              {invitation.invitedBy.name || invitation.invitedBy.email} invited you to join as{" "}
              <strong className="text-zinc-800 dark:text-zinc-200">{invitation.role}</strong>
            </p>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-zinc-500">Invited Email:</span>
            <span className="font-semibold text-zinc-800 dark:text-zinc-200">{invitation.email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Assigned Role:</span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">{invitation.role}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Expires:</span>
            <span className="text-zinc-700 dark:text-zinc-300">
              {new Date(invitation.expiresAt).toLocaleDateString()}
            </span>
          </div>
        </div>

        {!user ? (
          <div className="space-y-3">
            <p className="text-xs text-center text-zinc-500">
              Please sign in or create an account with <strong>{invitation.email}</strong> to accept this team invitation.
            </p>
            <div className="flex gap-3">
              <Link
                href={`/login?redirect=/invite/${token}`}
                className="flex-1 py-3 text-center rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm shadow-sm transition"
              >
                Sign In to Accept
              </Link>
              <Link
                href={`/register?redirect=/invite/${token}&email=${encodeURIComponent(invitation.email)}`}
                className="flex-1 py-3 text-center rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-semibold text-sm transition"
              >
                Register
              </Link>
            </div>
          </div>
        ) : (
          <InviteAction token={token} companyName={invitation.company.name} />
        )}
      </div>
    </div>
  );
}
