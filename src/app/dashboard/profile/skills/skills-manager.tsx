"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export type ApplicantSkillItem = {
  skillId: string;
  createdAt: string | Date;
  skill: {
    id: string;
    name: string;
    slug: string;
  };
};

export type SkillSuggestionItem = {
  id: string;
  name: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string | Date;
  updatedAt?: string | Date;
};

type SkillsManagerProps = {
  initialSkills: ApplicantSkillItem[];
  initialSuggestions: SkillSuggestionItem[];
};

export default function SkillsManager({
  initialSkills,
  initialSuggestions,
}: SkillsManagerProps) {
  const router = useRouter();

  const [skills, setSkills] = useState<ApplicantSkillItem[]>(initialSkills);
  const [suggestions, setSuggestions] = useState<SkillSuggestionItem[]>(initialSuggestions);

  // Search & Autocomplete state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ id: string; name: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Adding / deleting state
  const [isAdding, setIsAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Suggest skill state
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [suggestionName, setSuggestionName] = useState("");
  const [isSubmittingSuggestion, setIsSubmittingSuggestion] = useState(false);

  // Feedback messages
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (trimmed.length < 2) {
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/skills?q=${encodeURIComponent(trimmed)}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          // Filter out already added skills
          const existingIds = new Set(skills.map((s) => s.skillId));
          const available = json.data.filter((item: { id: string }) => !existingIds.has(item.id));
          setSearchResults(available);
          setIsDropdownOpen(true);
        }
      } catch (err) {
        console.error("Skill search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery, skills]);

  const handleAddSkill = async (skill: { id: string; name: string }) => {
    // Check duplicate
    if (skills.some((s) => s.skillId === skill.id)) {
      setErrorMessage("This skill is already in your profile.");
      return;
    }

    setIsAdding(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/me/skills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skillIds: [skill.id] }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorMessage(json.message || "Failed to add skill.");
        return;
      }

      // Add to local list
      const newItem: ApplicantSkillItem = {
        skillId: skill.id,
        createdAt: new Date().toISOString(),
        skill: {
          id: skill.id,
          name: skill.name,
          slug: skill.name.toLowerCase().replace(/\s+/g, "-"),
        },
      };

      setSkills((prev) => [newItem, ...prev]);
      setSuccessMessage(`"${skill.name}" added to your profile.`);
      setSearchQuery("");
      setIsDropdownOpen(false);
      router.refresh();
    } catch (err) {
      console.error("Add skill error:", err);
      setErrorMessage("Network error occurred while adding skill.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveSkill = async (skillId: string, skillName: string) => {
    setDeletingId(skillId);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/me/skills/${skillId}`, {
        method: "DELETE",
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorMessage(json.message || "Failed to remove skill.");
        return;
      }

      setSkills((prev) => prev.filter((s) => s.skillId !== skillId));
      setSuccessMessage(`"${skillName}" removed.`);
      router.refresh();
    } catch (err) {
      console.error("Delete skill error:", err);
      setErrorMessage("Network error occurred while removing skill.");
    } finally {
      setDeletingId(null);
    }
  };

  const handleSuggestSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = suggestionName.trim();

    if (!trimmed || trimmed.length < 2 || trimmed.length > 100) {
      setErrorMessage("Skill name must be between 2 and 100 characters.");
      return;
    }

    setIsSubmittingSuggestion(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/me/skill-suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setErrorMessage(json.message || "Failed to suggest skill.");
        return;
      }

      setSuggestions((prev) => [json.data, ...prev]);
      setSuccessMessage(`Skill suggestion "${trimmed}" submitted for review.`);
      setSuggestionName("");
      setIsSuggestModalOpen(false);
      router.refresh();
    } catch (err) {
      console.error("Suggest skill error:", err);
      setErrorMessage("Network error occurred while submitting suggestion.");
    } finally {
      setIsSubmittingSuggestion(false);
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

      {/* Search & Add Skills Section */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 sm:p-8 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Add Skills
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Search our curated skill taxonomy and add matching expertise to your profile.
          </p>
        </div>

        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                setSearchQuery(val);
                if (val.trim().length < 2) {
                  setSearchResults([]);
                  setIsSearching(false);
                  setIsDropdownOpen(false);
                }
              }}
              onFocus={() => {
                if (searchResults.length > 0) setIsDropdownOpen(true);
              }}
              placeholder="Search skills (e.g. React, Python, Docker, PostgreSQL)..."
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:focus:ring-zinc-400"
            />
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-zinc-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            {isSearching && (
              <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-zinc-400">
                Searching...
              </div>
            )}
          </div>

          {/* Autocomplete Results Dropdown */}
          {isDropdownOpen && searchResults.length > 0 && (
            <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl max-h-60 overflow-y-auto p-1.5 space-y-0.5">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  disabled={isAdding}
                  onClick={() => handleAddSkill(item)}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700/60 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="font-medium">{item.name}</span>
                  <span className="text-xs text-zinc-400 font-semibold">+ Add</span>
                </button>
              ))}
            </div>
          )}

          {isDropdownOpen && searchQuery.trim().length >= 2 && searchResults.length === 0 && !isSearching && (
            <div className="absolute z-30 left-0 right-0 mt-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl shadow-xl p-4 text-center">
              <p className="text-xs text-zinc-500">
                No matching skills found for &quot;{searchQuery}&quot;
              </p>
              <button
                type="button"
                onClick={() => {
                  setSuggestionName(searchQuery.trim());
                  setIsSuggestModalOpen(true);
                  setIsDropdownOpen(false);
                }}
                className="mt-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100 underline cursor-pointer"
              >
                Suggest &quot;{searchQuery}&quot; as a new skill →
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-zinc-400">
            Type at least 2 characters to trigger instant search.
          </p>
          <button
            type="button"
            onClick={() => {
              setSuggestionName("");
              setIsSuggestModalOpen(true);
            }}
            className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 underline cursor-pointer"
          >
            Can&apos;t find your skill? Suggest it
          </button>
        </div>
      </div>

      {/* Selected Skills Chips */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 sm:p-8 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Selected Skills ({skills.length})
          </h2>
          <span className="text-xs text-zinc-500">
            Click &times; to remove any skill
          </span>
        </div>

        {skills.length > 0 ? (
          <div className="flex flex-wrap gap-2 pt-2">
            {skills.map((item) => (
              <span
                key={item.skillId}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-700 transition-colors"
              >
                <span>{item.skill.name}</span>
                <button
                  type="button"
                  aria-label={`Remove ${item.skill.name}`}
                  disabled={deletingId === item.skillId}
                  onClick={() => handleRemoveSkill(item.skillId, item.skill.name)}
                  className="w-4 h-4 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 inline-flex items-center justify-center text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 cursor-pointer disabled:opacity-50"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
            <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
              No skills added yet
            </p>
            <p className="text-xs text-zinc-500 mt-1">
              Use the search box above to add skills to your candidate profile.
            </p>
          </div>
        )}
      </div>

      {/* User's Suggested Skills */}
      {suggestions.length > 0 && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 sm:p-8 space-y-4">
          <div className="pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Your Submitted Skill Suggestions
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Custom skills you have submitted for administrator moderation.
            </p>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {suggestions.map((sug) => (
              <div key={sug.id} className="py-2.5 flex items-center justify-between text-xs">
                <span className="font-medium text-zinc-900 dark:text-zinc-100">
                  {sug.name}
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full font-semibold ${
                    sug.status === "APPROVED"
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                      : sug.status === "REJECTED"
                      ? "bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-800"
                      : "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                  }`}
                >
                  {sug.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Suggest Skill Modal */}
      {isSuggestModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Suggest a New Skill
              </h2>
              <button
                type="button"
                onClick={() => setIsSuggestModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSuggestSkill} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Skill Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={suggestionName}
                  onChange={(e) => setSuggestionName(e.target.value)}
                  placeholder="e.g. Next.js 16 or Apache Kafka"
                  className="w-full px-3.5 py-2 text-sm rounded-lg bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-900"
                />
                <p className="text-[11px] text-zinc-400 mt-1">
                  Our moderators will review and approve valid technical and professional skills.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsSuggestModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSuggestion}
                  className="px-5 py-2 text-xs font-semibold rounded-lg bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isSubmittingSuggestion ? "Submitting..." : "Submit Suggestion"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
