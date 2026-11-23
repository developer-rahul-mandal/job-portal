"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export type ResumeItem = {
  id: string;
  title: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  isDefault: boolean;
  createdAt: string | Date;
  updatedAt?: string | Date;
};

type ResumeManagerProps = {
  initialResumes: ResumeItem[];
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_EXTENSIONS = [".pdf", ".doc", ".docx"];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ResumeManager({ initialResumes }: ResumeManagerProps) {
  const router = useRouter();
  const [resumes, setResumes] = useState<ResumeItem[]>(initialResumes);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [resumeTitle, setResumeTitle] = useState("");
  const [isDefaultCheckbox, setIsDefaultCheckbox] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Action states
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Feedback messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const validateFile = (file: File): string | null => {
    if (file.size === 0) {
      return "The selected file is empty.";
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File size (${formatFileSize(file.size)}) exceeds the maximum allowed 5 MB limit.`;
    }
    const name = file.name.toLowerCase();
    const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => name.endsWith(ext));
    if (!hasValidExt) {
      return "Only PDF, DOC, and DOCX files are supported.";
    }
    return null;
  };

  const handleFileSelection = (file: File) => {
    setErrorMessage(null);
    setSuccessMessage(null);
    const error = validateFile(file);
    if (error) {
      setErrorMessage(error);
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
    // Auto-set title from filename without extension if empty
    if (!resumeTitle) {
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      setResumeTitle(baseName.slice(0, 100));
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelection(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage("Please choose a file to upload.");
      return;
    }

    const valError = validateFile(selectedFile);
    if (valError) {
      setErrorMessage(valError);
      return;
    }

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    if (resumeTitle.trim()) {
      formData.append("title", resumeTitle.trim());
    }
    formData.append("isDefault", isDefaultCheckbox ? "true" : "false");

    try {
      const res = await fetch("/api/me/resumes", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorMessage(json.message || "Failed to upload resume.");
        return;
      }

      const uploaded: ResumeItem = json.data;

      // Update state
      if (uploaded.isDefault) {
        setResumes((prev) => [
          uploaded,
          ...prev.map((r) => ({ ...r, isDefault: false })),
        ]);
      } else {
        setResumes((prev) => [uploaded, ...prev]);
      }

      setSuccessMessage(`Resume "${uploaded.title}" uploaded successfully.`);
      setSelectedFile(null);
      setResumeTitle("");
      setIsDefaultCheckbox(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      router.refresh();
    } catch (err) {
      console.error("Resume upload failed:", err);
      setErrorMessage("Network error occurred while uploading. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSetDefault = async (id: string, title: string) => {
    setSettingDefaultId(id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/me/resumes/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorMessage(json.message || "Failed to set default resume.");
        return;
      }

      setResumes((prev) =>
        prev.map((r) => ({
          ...r,
          isDefault: r.id === id,
        }))
      );

      setSuccessMessage(`"${title}" is now set as your primary default resume.`);
      router.refresh();
    } catch (err) {
      console.error("Set default resume error:", err);
      setErrorMessage("Network error occurred while setting default resume.");
    } finally {
      setSettingDefaultId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;

    setIsDeleting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/me/resumes/${deleteTargetId}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorMessage(json.message || "Failed to delete resume.");
        return;
      }

      setResumes((prev) => prev.filter((r) => r.id !== deleteTargetId));
      setSuccessMessage("Resume deleted successfully.");
      setDeleteTargetId(null);
      router.refresh();
    } catch (err) {
      console.error("Delete resume error:", err);
      setErrorMessage("Network error occurred while deleting resume.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Alert Messages */}
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

      {/* Upload Box Section */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 sm:p-8 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Upload Resume
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Upload your updated CV or resume. Supported formats: PDF, DOC, DOCX up to 5 MB.
          </p>
        </div>

        <form onSubmit={handleUpload} className="space-y-4">
          {/* Drag & Drop Zone */}
          <div
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              dragActive
                ? "border-zinc-900 bg-zinc-50 dark:border-white dark:bg-zinc-800"
                : "border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-800/30"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileSelection(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            <div className="w-12 h-12 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 mb-3">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z" />
              </svg>
            </div>

            {selectedFile ? (
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  {formatFileSize(selectedFile.size)} • Click or drop another file to replace
                </p>
              </div>
            ) : (
              <div>
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Click to select a resume or drag and drop here
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  PDF, DOC, DOCX up to 5 MB
                </p>
              </div>
            )}
          </div>

          {/* Optional Title & Default Setting */}
          {selectedFile && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Resume Title / Label
                </label>
                <input
                  type="text"
                  value={resumeTitle}
                  onChange={(e) => setResumeTitle(e.target.value)}
                  placeholder="e.g. Senior Backend Resume 2026"
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </div>

              <div className="flex items-center gap-2 sm:pt-6">
                <input
                  type="checkbox"
                  id="makeDefault"
                  checked={isDefaultCheckbox}
                  onChange={(e) => setIsDefaultCheckbox(e.target.checked)}
                  className="rounded border-zinc-300 dark:border-zinc-700 text-zinc-900 focus:ring-zinc-900"
                />
                <label htmlFor="makeDefault" className="text-xs text-zinc-700 dark:text-zinc-300 font-medium cursor-pointer">
                  Set as default resume for applications
                </label>
              </div>
            </div>
          )}

          {selectedFile && (
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isUploading}
                className="px-6 py-2.5 text-xs font-semibold rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {isUploading ? "Uploading Resume..." : "Upload Resume"}
              </button>
            </div>
          )}
        </form>
      </div>

      {/* Resumes List */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Manage Resumes ({resumes.length})
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Download, manage default status, or delete stored resumes.
            </p>
          </div>
        </div>

        {resumes.length > 0 ? (
          <div className="space-y-3 pt-2">
            {resumes.map((resume) => (
              <div
                key={resume.id}
                className="p-4 sm:p-5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="min-w-0 flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-300 flex-shrink-0 mt-0.5">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {resume.title}
                        </p>
                        {resume.isDefault && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            Default
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-500 mt-1">
                        {resume.fileName} • {formatFileSize(resume.fileSize)}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Uploaded on {formatDate(resume.createdAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <a
                      href={`/api/me/resumes/${resume.id}/download`}
                      download
                      className="px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors cursor-pointer"
                    >
                      Download
                    </a>

                    {!resume.isDefault && (
                      <button
                        type="button"
                        disabled={settingDefaultId === resume.id}
                        onClick={() => handleSetDefault(resume.id, resume.title)}
                        className="px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {settingDefaultId === resume.id ? "Setting..." : "Set as Default"}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setDeleteTargetId(resume.id)}
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
          <div className="p-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
              No resumes uploaded yet
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Upload your first resume using the upload box above.
            </p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTargetId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
              Confirm Resume Deletion
            </h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-2">
              Are you sure you want to permanently delete this resume? The stored file will be removed and any pending job applications will no longer link to this physical file.
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
                {isDeleting ? "Deleting..." : "Delete Resume"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
