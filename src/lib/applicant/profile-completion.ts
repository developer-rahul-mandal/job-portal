export type ProfileCompletionSection = {
  id: string;
  label: string;
  weight: number;
  isCompleted: boolean;
  href: string;
  hint: string;
};

export type ProfileCompletionResult = {
  percentage: number;
  sections: ProfileCompletionSection[];
  missingSections: ProfileCompletionSection[];
  isComplete: boolean;
};

export type ApplicantProfileData = {
  profile?: {
    headline?: string | null;
    location?: string | null;
    phone?: string | null;
    bio?: string | null;
    profileImage?: string | null;
  } | null;
  educationCount: number;
  experienceCount: number;
  skillsCount: number;
  resumesCount: number;
};

/**
 * Calculates applicant profile completeness percentage and missing section checklist.
 * Total: 100%
 * - Personal Information (Phone & Location): 15%
 * - Professional Summary (Headline & Bio): 15%
 * - Profile Picture: 10%
 * - Education: 20%
 * - Experience: 20%
 * - Skills: 10%
 * - Resume: 10%
 */
export function calculateProfileCompletion(data: ApplicantProfileData): ProfileCompletionResult {
  const profile = data.profile;
  const headline = profile?.headline?.trim();
  const location = profile?.location?.trim();
  const phone = profile?.phone?.trim();
  const bio = profile?.bio?.trim();
  const hasProfileImage = Boolean(profile?.profileImage);

  const sections: ProfileCompletionSection[] = [
    {
      id: "personal_info",
      label: "Phone & Location",
      weight: 15,
      isCompleted: Boolean(phone && location),
      href: "/dashboard/profile",
      hint: "Add your contact phone number and location so recruiters can reach you.",
    },
    {
      id: "headline_bio",
      label: "Headline & Bio",
      weight: 15,
      isCompleted: Boolean(headline && bio),
      href: "/dashboard/profile",
      hint: "Provide a professional headline and summary bio describing your expertise.",
    },
    {
      id: "avatar",
      label: "Profile Picture",
      weight: 10,
      isCompleted: hasProfileImage,
      href: "/dashboard/profile#avatar",
      hint: "Upload a professional square headshot to build trust with hiring managers.",
    },
    {
      id: "education",
      label: "Education",
      weight: 20,
      isCompleted: data.educationCount > 0,
      href: "/dashboard/profile/education",
      hint: "Add at least one degree, certification, or educational milestone.",
    },
    {
      id: "experience",
      label: "Work Experience",
      weight: 20,
      isCompleted: data.experienceCount > 0,
      href: "/dashboard/profile/experience",
      hint: "Add at least one past or present employment record.",
    },
    {
      id: "skills",
      label: "Skills",
      weight: 10,
      isCompleted: data.skillsCount > 0,
      href: "/dashboard/profile/skills",
      hint: "Tag your core technical and professional competencies.",
    },
    {
      id: "resume",
      label: "Resume Document",
      weight: 10,
      isCompleted: data.resumesCount > 0,
      href: "/dashboard/resumes",
      hint: "Upload a primary resume (PDF, DOC, or DOCX) for quick applications.",
    },
  ];

  const percentage = sections.reduce(
    (total, sec) => (sec.isCompleted ? total + sec.weight : total),
    0
  );

  const missingSections = sections.filter((s) => !s.isCompleted);

  return {
    percentage,
    sections,
    missingSections,
    isComplete: percentage === 100,
  };
}
