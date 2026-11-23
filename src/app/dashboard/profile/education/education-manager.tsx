"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type EducationItem = {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string | null;
  startDate: string | Date;
  endDate: string | Date | null;
  isCurrentlyStudying: boolean;
  grade: string | null;
  description: string | null;
};

type EducationManagerProps = {
  initialEducation: EducationItem[];
};

function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function toISODateString(date: string | Date | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

export default function EducationManager({ initialEducation }: EducationManagerProps) {
  const router = useRouter();
  const [educationList, setEducationList] = useState<EducationItem[]>(initialEducation);

  // Modal / Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [institution, setInstitution] = useState("");
  const [degree, setDegree] = useState("");
  const [fieldOfStudy, setFieldOfStudy] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isCurrentlyStudying, setIsCurrentlyStudying] = useState(false);
  const [grade, setGrade] = useState("");
  const [description, setDescription] = useState("");

  // Loading & feedback states
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Delete modal state
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openAddModal = () => {
    setEditingId(null);
    setInstitution("");
    setDegree("");
    setFieldOfStudy("");
    setStartDate("");
    setEndDate("");
    setIsCurrentlyStudying(false);
    setGrade("");
    setDescription("");
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const openEditModal = (item: EducationItem) => {
    setEditingId(item.id);
    setInstitution(item.institution);
    setDegree(item.degree);
    setFieldOfStudy(item.fieldOfStudy || "");
    setStartDate(toISODateString(item.startDate));
    setEndDate(toISODateString(item.endDate));
    setIsCurrentlyStudying(item.isCurrentlyStudying);
    setGrade(item.grade || "");
    setDescription(item.description || "");
    setErrorMessage(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
    setErrorMessage(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Client-side validations
    const trimmedInstitution = institution.trim();
    const trimmedDegree = degree.trim();

    if (!trimmedInstitution || trimmedInstitution.length > 200) {
      setErrorMessage("Institution is required (up to 200 characters).");
      return;
    }

    if (!trimmedDegree || trimmedDegree.length > 150) {
      setErrorMessage("Degree is required (up to 150 characters).");
      return;
    }

    if (!startDate) {
      setErrorMessage("Start date is required.");
      return;
    }

    const todayStr = new Date().toISOString().slice(0, 10);
    if (startDate > todayStr) {
      setErrorMessage("Start date cannot be in the future.");
      return;
    }

    if (!isCurrentlyStudying) {
      if (!endDate) {
        setErrorMessage("End date is required unless currently studying.");
        return;
      }
      if (endDate < startDate) {
        setErrorMessage("End date cannot be earlier than start date.");
        return;
      }
      if (endDate > todayStr) {
        setErrorMessage("End date cannot be in the future. Check 'Currently Studying' if enrolled.");
        return;
      }
    }

    setIsSaving(true);

    const payload: Record<string, unknown> = {
      institution: trimmedInstitution,
      degree: trimmedDegree,
      fieldOfStudy: fieldOfStudy.trim() || null,
      startDate,
      endDate: isCurrentlyStudying ? null : endDate || null,
      isCurrentlyStudying,
      grade: grade.trim() || null,
      description: description.trim() || null,
    };

    try {
      const url = editingId ? `/api/me/education/${editingId}` : "/api/me/education";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Failed to save education entry.");
        return;
      }

      // Update state
      if (editingId) {
        setEducationList((prev) =>
          prev.map((item) => (item.id === editingId ? { ...item, ...data.data } : item))
        );
        setSuccessMessage("Education updated successfully.");
      } else {
        setEducationList((prev) => [data.data, ...prev]);
        setSuccessMessage("Education entry added successfully.");
      }

      closeModal();
      router.refresh();
    } catch (err) {
      console.error("Education save error:", err);
      setErrorMessage("Network error occurred while saving. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;

    setIsDeleting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/me/education/${deleteTargetId}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setErrorMessage(data.message || "Failed to delete education entry.");
        return;
      }

      setEducationList((prev) => prev.filter((item) => item.id !== deleteTargetId));
      setSuccessMessage("Education entry deleted.");
      setDeleteTargetId(null);
      router.refresh();
    } catch (err) {
      console.error("Delete error:", err);
      setErrorMessage("Network error occurred while deleting. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-300">
          <p className="font-semibold">Error</p>
          <p className="mt-0.5">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-800 dark:text-emerald-300">
          <p className="font-semibold">Success</p>
          <p className="mt-0.5">{successMessage}</p>
        </div>
      )}

      {/* Header and Add Button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Education History
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5">
            Manage your degrees, academic institutions, and certifications.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors cursor-pointer"
        >
          <span>+ Add Education</span>
        </button>
      </div>

      {/* Education List */}
      {educationList.length > 0 ? (
        <div className="space-y-4">
          {educationList.map((item) => (
            <div
              key={item.id}
              className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-5 sm:p-6 transition-all"
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                      {item.degree} {item.fieldOfStudy ? `in ${item.fieldOfStudy}` : ""}
                    </h3>
                    {item.isCurrentlyStudying && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                        Currently Studying
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium mt-1">
                    {item.institution}
                  </p>

                  <p className="text-xs text-zinc-500 mt-1">
                    {formatDate(item.startDate)} – {item.isCurrentlyStudying ? "Present" : item.endDate ? formatDate(item.endDate) : ""}
                    {item.grade ? ` • Grade: ${item.grade}` : ""}
                  </p>

                  {item.description && (
                    <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-3 whitespace-pre-line leading-relaxed">
                      {item.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 self-end sm:self-start">
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTargetId(item.id)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-lg transition-colors cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl p-10 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 mb-3">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            No education entries yet
          </h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Add your degrees, diplomas, or relevant academic courses to showcase your qualifications.
          </p>
          <button
            type="button"
            onClick={openAddModal}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors cursor-pointer"
          >
            + Add First Education
          </button>
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                {editingId ? "Edit Education" : "Add Education"}
              </h2>
              <button
                type="button"
                onClick={closeModal}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Institution / School <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={institution}
                  onChange={(e) => setInstitution(e.target.value)}
                  placeholder="e.g. Stanford University or Delhi University"
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Degree <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                    placeholder="e.g. Bachelor of Technology"
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Field of Study
                  </label>
                  <input
                    type="text"
                    value={fieldOfStudy}
                    onChange={(e) => setFieldOfStudy(e.target.value)}
                    placeholder="e.g. Computer Science"
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    disabled={isCurrentlyStudying}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="currentlyStudying"
                  checked={isCurrentlyStudying}
                  onChange={(e) => {
                    setIsCurrentlyStudying(e.target.checked);
                    if (e.target.checked) setEndDate("");
                  }}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-900"
                />
                <label htmlFor="currentlyStudying" className="text-xs text-zinc-700 dark:text-zinc-300">
                  I am currently studying here
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Grade / GPA (Optional)
                </label>
                <input
                  type="text"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="e.g. 3.8 GPA or 85%"
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Description / Achievements (Optional)
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Relevant courses, honors, leadership positions, or final project..."
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSaving ? "Saving..." : editingId ? "Update Entry" : "Add Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Confirm Deletion
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">
              Are you sure you want to delete this education entry? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setDeleteTargetId(null)}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
