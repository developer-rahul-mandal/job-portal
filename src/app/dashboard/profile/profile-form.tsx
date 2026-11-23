"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ProfilePictureCropper from "@/components/profile/profile-picture-cropper";

type SocialItem = {
  name: string;
  url: string;
};

type ProfileFormProps = {
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  initialProfile: {
    phone: string | null;
    headline: string | null;
    bio: string | null;
    location: string | null;
    profileImage: string | null;
    socials: unknown;
  } | null;
};

export default function ProfileForm({ user, initialProfile }: ProfileFormProps) {
  const router = useRouter();

  // Parse initial socials
  const initialSocialsList: SocialItem[] = Array.isArray(initialProfile?.socials)
    ? (initialProfile.socials as SocialItem[]).filter(
        (s) => s && typeof s.name === "string" && typeof s.url === "string"
      )
    : [];

  const initialLinkedIn =
    initialSocialsList.find((s) => s.name.toLowerCase() === "linkedin")?.url || "";
  const initialGitHub =
    initialSocialsList.find((s) => s.name.toLowerCase() === "github")?.url || "";
  const initialWebsite =
    initialSocialsList.find((s) => s.name.toLowerCase() === "portfolio" || s.name.toLowerCase() === "website")?.url || "";

  // Other custom socials
  const initialOtherSocials = initialSocialsList.filter(
    (s) => !["linkedin", "github", "portfolio", "website"].includes(s.name.toLowerCase())
  );

  const [name, setName] = useState(user.name || "");
  const [phone, setPhone] = useState(initialProfile?.phone || "");
  const [headline, setHeadline] = useState(initialProfile?.headline || "");
  const [bio, setBio] = useState(initialProfile?.bio || "");
  const [location, setLocation] = useState(initialProfile?.location || "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(
    initialProfile?.profileImage
      ? initialProfile.profileImage.startsWith("http")
        ? initialProfile.profileImage
        : "/api/me/profile/avatar"
      : null
  );

  const [linkedin, setLinkedin] = useState(initialLinkedIn);
  const [github, setGithub] = useState(initialGitHub);
  const [website, setWebsite] = useState(initialWebsite);
  const [otherSocials, setOtherSocials] = useState<SocialItem[]>(initialOtherSocials);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleAddSocial = () => {
    if (otherSocials.length >= 10) return;
    setOtherSocials([...otherSocials, { name: "", url: "" }]);
  };

  const handleRemoveSocial = (index: number) => {
    setOtherSocials(otherSocials.filter((_, i) => i !== index));
  };

  const handleUpdateSocial = (index: number, field: "name" | "url", value: string) => {
    const updated = [...otherSocials];
    updated[index][field] = value;
    setOtherSocials(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    // Validation
    const trimmedName = name.trim();
    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 150) {
      setErrorMessage("Full name is required and must be between 2 and 150 characters.");
      return;
    }

    // Strict numeric-only phone validation
    const trimmedPhone = phone.trim();
    if (trimmedPhone) {
      if (!/^\d+$/.test(trimmedPhone)) {
        setErrorMessage("Phone number must contain digits only (0–9). Letters and special characters are not allowed.");
        return;
      }
      if (trimmedPhone.length < 7 || trimmedPhone.length > 15) {
        setErrorMessage("Phone number must be between 7 and 15 digits.");
        return;
      }
    }

    if (headline.trim() && headline.trim().length > 200) {
      setErrorMessage("Professional headline cannot exceed 200 characters.");
      return;
    }

    if (bio.trim() && bio.trim().length > 5000) {
      setErrorMessage("Bio cannot exceed 5000 characters.");
      return;
    }

    if (location.trim() && location.trim().length > 150) {
      setErrorMessage("Location cannot exceed 150 characters.");
      return;
    }

    // Build socials array
    const socialsPayload: SocialItem[] = [];
    if (linkedin.trim()) {
      socialsPayload.push({ name: "LinkedIn", url: linkedin.trim() });
    }
    if (github.trim()) {
      socialsPayload.push({ name: "GitHub", url: github.trim() });
    }
    if (website.trim()) {
      socialsPayload.push({ name: "Website", url: website.trim() });
    }

    for (const item of otherSocials) {
      const sName = item.name.trim();
      const sUrl = item.url.trim();
      if (sName || sUrl) {
        if (!sName || !sUrl) {
          setErrorMessage("Custom social links must have both a label and a URL.");
          return;
        }
        try {
          const parsed = new URL(sUrl);
          if (!["http:", "https:"].includes(parsed.protocol)) {
            setErrorMessage(`Social link "${sName}" must start with http:// or https://`);
            return;
          }
        } catch {
          setErrorMessage(`Invalid URL for "${sName}". Must be a valid web link.`);
          return;
        }
        socialsPayload.push({ name: sName, url: sUrl });
      }
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          phone: trimmedPhone || null,
          headline: headline.trim() || null,
          bio: bio.trim() || null,
          location: location.trim() || null,
          socials: socialsPayload.length > 0 ? socialsPayload : null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setErrorMessage(data.message || "Failed to update profile. Please try again.");
        return;
      }

      setSuccessMessage("Your profile has been saved successfully.");
      router.refresh();
    } catch (err) {
      console.error("Profile save error:", err);
      setErrorMessage("Network error occurred while saving profile. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Alert Messages */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-sm text-red-800 dark:text-red-300">
          <p className="font-semibold">Unable to save profile</p>
          <p className="mt-0.5">{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-sm text-emerald-800 dark:text-emerald-300">
          <p className="font-semibold">Success</p>
          <p className="mt-0.5">{successMessage}</p>
        </div>
      )}

      {/* Profile Picture Card */}
      <div id="avatar" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Profile Picture
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Upload a clear square headshot. Your photo is securely stored and private to your account.
          </p>
        </div>

        <ProfilePictureCropper
          currentAvatarUrl={avatarUrl}
          onAvatarUpdated={(newUrl) => {
            setAvatarUrl(newUrl);
            setSuccessMessage(newUrl ? "Profile picture updated successfully." : "Profile picture removed.");
            router.refresh();
          }}
        />
      </div>

      {/* Basic Personal Information */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Personal Information
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Your identity and primary contact channels.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Rahul Mandal"
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              disabled
              value={user.email}
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 text-zinc-500 dark:text-zinc-400 cursor-not-allowed"
            />
            <p className="text-[11px] text-zinc-400 mt-1">Primary email managed by authentication</p>
          </div>

          <div>
            <label htmlFor="phone" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              value={phone}
              onChange={(e) => {
                // Strip non-digit characters on input
                const digitsOnly = e.target.value.replace(/\D/g, "");
                setPhone(digitsOnly);
              }}
              placeholder="e.g. 9876543210 (digits only)"
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-[11px] text-zinc-400 mt-1">Numeric digits 0–9 only (7–15 digits, preserves leading zeroes)</p>
          </div>

          <div>
            <label htmlFor="location" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Location / City
            </label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g. Bangalore, India"
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Professional Summary */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Professional Summary
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Headline and summary that recruiters see on your candidate profile.
          </p>
        </div>

        <div>
          <label htmlFor="headline" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
            Headline
          </label>
          <input
            id="headline"
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="e.g. Senior Full-Stack Engineer | React, TypeScript & Node.js"
            className="w-full px-3.5 py-2 text-sm rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-[11px] text-zinc-400 mt-1">Brief one-line summary (up to 200 characters)</p>
        </div>

        <div>
          <label htmlFor="bio" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
            Bio / Summary
          </label>
          <textarea
            id="bio"
            rows={5}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Detail your engineering background, major accomplishments, technical strengths, and what roles you are seeking..."
            className="w-full px-3.5 py-2 text-sm rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-[11px] text-zinc-400 mt-1">Up to 5000 characters</p>
        </div>
      </div>

      {/* Social & Portfolio Links */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Social & Portfolio Links
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Links to your code repositories, professional network, and personal portfolio.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="linkedin" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              LinkedIn
            </label>
            <input
              id="linkedin"
              type="url"
              value={linkedin}
              onChange={(e) => setLinkedin(e.target.value)}
              placeholder="https://linkedin.com/in/username"
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="github" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              GitHub
            </label>
            <input
              id="github"
              type="url"
              value={github}
              onChange={(e) => setGithub(e.target.value)}
              placeholder="https://github.com/username"
              className="w-full px-3.5 py-2 text-sm rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="website" className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
            Personal Portfolio / Website
          </label>
          <input
            id="website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://yourportfolio.dev"
            className="w-full px-3.5 py-2 text-sm rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Custom Social Channels */}
        {otherSocials.length > 0 && (
          <div className="space-y-3 pt-2">
            <h3 className="text-xs font-bold text-zinc-700 dark:text-zinc-300">Additional Channels</h3>
            {otherSocials.map((social, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Platform (e.g. X, Medium)"
                  value={social.name}
                  onChange={(e) => handleUpdateSocial(idx, "name", e.target.value)}
                  className="w-1/3 px-3.5 py-2 text-sm rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="url"
                  placeholder="https://..."
                  value={social.url}
                  onChange={(e) => handleUpdateSocial(idx, "url", e.target.value)}
                  className="flex-1 px-3.5 py-2 text-sm rounded-xl bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveSocial(idx)}
                  className="p-2 text-zinc-400 hover:text-red-500 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
                  title="Remove channel"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {otherSocials.length < 10 && (
          <button
            type="button"
            onClick={handleAddSocial}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition"
          >
            + Add Another Channel
          </button>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex items-center justify-end gap-3 pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 shadow-sm transition disabled:opacity-50"
        >
          {isSubmitting ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Saving Changes...
            </>
          ) : (
            "Save Profile Changes"
          )}
        </button>
      </div>
    </form>
  );
}
