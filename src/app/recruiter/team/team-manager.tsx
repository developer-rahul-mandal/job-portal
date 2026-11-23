"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MemberItem {
  id: string;
  userId: string;
  membershipRole: "OWNER" | "ADMIN" | "RECRUITER";
  status: "PENDING" | "ACTIVE" | "REJECTED" | "REMOVED" | string;
  createdAt: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    role: string;
  };
}

interface TeamManagerProps {
  initialMembers: MemberItem[];
  callerUserId: string;
  callerMembershipRole: "OWNER" | "ADMIN" | "RECRUITER";
}

export default function TeamManager({
  initialMembers,
  callerUserId,
  callerMembershipRole,
}: TeamManagerProps) {
  const router = useRouter();

  const [showAddModal, setShowAddModal] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [roleInput, setRoleInput] = useState<"RECRUITER" | "ADMIN">("RECRUITER");
  const [addLoading, setAddLoading] = useState(false);
  const [removeLoadingId, setRemoveLoadingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canManageTeam =
    callerMembershipRole === "OWNER" || callerMembershipRole === "ADMIN";

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!emailInput.trim()) return;

    setError(null);
    setSuccess(null);
    setAddLoading(true);

    try {
      const res = await fetch("/api/recruiter/team", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailInput.trim(),
          role: roleInput,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to add team member.");
      }

      setSuccess(data.message || "Team member added successfully.");
      setEmailInput("");
      setRoleInput("RECRUITER");
      setShowAddModal(false);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to add team member.");
    } finally {
      setAddLoading(false);
    }
  }

  async function handleRemoveMember(membershipId: string) {
    setError(null);
    setSuccess(null);
    setRemoveLoadingId(membershipId);

    try {
      const res = await fetch(`/api/recruiter/team/${membershipId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Failed to remove team member.");
      }

      setSuccess(data.message || "Team member removed.");
      setConfirmRemoveId(null);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to remove team member.");
    } finally {
      setRemoveLoadingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-sm text-red-700 dark:text-red-300 flex items-start gap-3">
          <svg className="w-5 h-5 shrink-0 mt-0.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="flex-1">{error}</div>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-sm text-emerald-700 dark:text-emerald-300 flex items-start gap-3">
          <svg className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <div className="flex-1">{success}</div>
        </div>
      )}

      {/* Information Banner */}
      <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 flex items-start gap-3.5">
        <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-xs text-blue-900 dark:text-blue-200 leading-relaxed">
          <span className="font-bold">Team Member Invitation Policy:</span> Team members must have a registered JobPortal account under their corporate email address to be added. If a colleague doesn&apos;t have an account yet, ask them to sign up first. (Direct email invitation tokens for unregistered individuals will be available in an upcoming maintenance release).
        </div>
      </div>

      {/* Actions Bar */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Members ({initialMembers.length})
        </h2>

        {canManageTeam && (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-xs"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Add Team Member
          </button>
        )}
      </div>

      {/* Members Table */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-50 dark:bg-zinc-800/60 border-b border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Member</th>
                <th className="py-3.5 px-4">Email</th>
                <th className="py-3.5 px-4">Company Role</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Joined</th>
                {canManageTeam && <th className="py-3.5 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 text-zinc-700 dark:text-zinc-300">
              {initialMembers.map((m) => {
                const isSelf = m.userId === callerUserId;
                const isOwner = m.membershipRole === "OWNER";
                const isTargetAdmin = m.membershipRole === "ADMIN";
                // Admin cannot delete another Admin (only Owner can delete Admin)
                const canDeleteThisMember =
                  canManageTeam &&
                  !isOwner &&
                  !isSelf &&
                  (callerMembershipRole === "OWNER" || (callerMembershipRole === "ADMIN" && !isTargetAdmin));

                return (
                  <tr key={m.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold flex items-center justify-center text-xs">
                          {m.user.name ? m.user.name.slice(0, 2).toUpperCase() : m.user.email.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {m.user.name || "Unnamed User"}
                            {isSelf && (
                              <span className="ml-2 text-[10px] text-zinc-400 font-normal">(You)</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap font-mono text-xs text-zinc-600 dark:text-zinc-400">
                      {m.user.email}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          m.membershipRole === "OWNER"
                            ? "bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300"
                            : m.membershipRole === "ADMIN"
                            ? "bg-purple-100 dark:bg-purple-950/60 text-purple-800 dark:text-purple-300"
                            : "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300"
                        }`}
                      >
                        {m.membershipRole}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        {m.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap text-zinc-500">
                      {new Date(m.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>

                    {canManageTeam && (
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        {canDeleteThisMember ? (
                          <button
                            type="button"
                            onClick={() => setConfirmRemoveId(m.id)}
                            className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                            title="Remove member"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        ) : (
                          <span className="text-[10px] text-zinc-400 italic">Protected</span>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Add Team Colleague
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-zinc-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Registered Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="colleague@yourcompany.com"
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-[10px] text-zinc-400">
                  The user must already have an account on JobPortal.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                  Role Permission
                </label>
                <select
                  value={roleInput}
                  onChange={(e) => setRoleInput(e.target.value as typeof roleInput)}
                  className="w-full px-3.5 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="RECRUITER">Recruiter (Post and manage jobs)</option>
                  {callerMembershipRole === "OWNER" && (
                    <option value="ADMIN">Administrator (Manage company profile and team)</option>
                  )}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
                >
                  {addLoading ? "Adding..." : "Add to Team"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Remove Member Confirmation Modal */}
      {confirmRemoveId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
            <div className="w-12 h-12 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7a4 4 0 11-8 0 4 4 0 018 0zM9 14a6 6 0 00-6 6v1h12v-1a6 6 0 00-6-6zM21 12h-6" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Remove Team Member</h3>
              <p className="text-xs text-zinc-500 mt-1">
                Are you sure you want to revoke this colleague&apos;s access to this company workspace?
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmRemoveId(null)}
                className="px-4 py-2 rounded-xl border border-zinc-300 dark:border-zinc-700 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={removeLoadingId === confirmRemoveId}
                onClick={() => handleRemoveMember(confirmRemoveId)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50"
              >
                {removeLoadingId === confirmRemoveId ? "Removing..." : "Remove Member"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
