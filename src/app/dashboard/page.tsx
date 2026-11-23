import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { calculateProfileCompletion } from "@/lib/applicant/profile-completion";

export const metadata = {
  title: "Candidate Dashboard — JobPortal",
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

export default async function DashboardPage() {
  const user = await getServerSession();

  if (!user) {
    redirect("/login?redirect=/dashboard");
  }

  const [profile, educationList, experienceList, skillsList, defaultResume, counts, recentApplications] =
    await Promise.all([
      prisma.userProfile.findUnique({
        where: { userId: user.id },
      }),
      prisma.applicantEducation.findMany({
        where: { userId: user.id },
        orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
        take: 3,
      }),
      prisma.applicantExperience.findMany({
        where: { userId: user.id },
        orderBy: [{ startDate: "desc" }, { createdAt: "desc" }],
        take: 3,
      }),
      prisma.applicantSkill.findMany({
        where: { userId: user.id },
        include: { skill: true },
        take: 12,
      }),
      prisma.applicantResume.findFirst({
        where: { userId: user.id, isDefault: true },
      }),
      Promise.all([
        prisma.applicantEducation.count({ where: { userId: user.id } }),
        prisma.applicantExperience.count({ where: { userId: user.id } }),
        prisma.applicantSkill.count({ where: { userId: user.id } }),
        prisma.applicantResume.count({ where: { userId: user.id } }),
        prisma.application.count({ where: { userId: user.id } }),
      ]),
      prisma.application.findMany({
        where: { userId: user.id },
        include: {
          job: {
            select: {
              id: true,
              slug: true,
              title: true,
              detailedTitle: true,
              company: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
    ]);

  const [educationCount, experienceCount, skillsCount, resumesCount, applicationsCount] = counts;

  const completion = calculateProfileCompletion({
    profile,
    educationCount,
    experienceCount,
    skillsCount,
    resumesCount,
  });

  return (
    <div className="space-y-6">
      {/* Welcome Banner with Avatar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
              {profile?.profileImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src="/api/me/profile/avatar"
                  alt={user.name || "Candidate"}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-zinc-600 dark:text-zinc-300">
                  {(user.name || user.email).charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-zinc-50">
                Welcome back, {user.name || "Candidate"}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {profile?.headline || "Complete your profile to unlock verified recruiter discovery and 1-click applications."}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link
              href="/dashboard/profile"
              className="inline-flex items-center justify-center px-4 py-2 text-xs sm:text-sm font-semibold rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100 transition-colors shadow-sm"
            >
              Edit Profile
            </Link>
          </div>
        </div>

        {/* Profile Completion Indicator */}
        <div className="mt-8 pt-6 border-t border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Profile Completeness
              </span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  completion.percentage >= 80
                    ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                    : completion.percentage >= 50
                    ? "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                    : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                }`}
              >
                {completion.percentage}%
              </span>
            </div>
            <span className="text-xs text-zinc-500">
              {completion.isComplete ? "All sections complete" : `${completion.missingSections.length} sections remaining`}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2.5 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                completion.percentage >= 80
                  ? "bg-emerald-600 dark:bg-emerald-500"
                  : completion.percentage >= 50
                  ? "bg-amber-600 dark:bg-amber-500"
                  : "bg-zinc-900 dark:bg-zinc-400"
              }`}
              style={{ width: `${completion.percentage}%` }}
            />
          </div>

          {/* Missing Sections Checklist */}
          {completion.missingSections.length > 0 && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {completion.missingSections.map((sec) => (
                <Link
                  key={sec.id}
                  href={sec.href}
                  className="flex items-center justify-between p-2.5 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 text-xs text-zinc-600 dark:text-zinc-400 transition-colors group"
                >
                  <span className="font-medium text-zinc-900 dark:text-zinc-200 group-hover:text-zinc-950 dark:group-hover:text-white">
                    + Add {sec.label}
                  </span>
                  <span className="text-zinc-400 group-hover:translate-x-0.5 transition-transform">
                    →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resume Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-zinc-700 dark:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Primary Resume
                </h2>
              </div>
              <span className="text-xs text-zinc-500">
                {resumesCount} {resumesCount === 1 ? "resume" : "resumes"} total
              </span>
            </div>

            <div className="mt-4">
              {defaultResume ? (
                <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                          {defaultResume.title}
                        </p>
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          Default
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1">
                        {defaultResume.fileName} • {formatFileSize(defaultResume.fileSize)}
                      </p>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Uploaded {formatDate(defaultResume.createdAt)}
                      </p>
                    </div>

                    <a
                      href={`/api/me/resumes/${defaultResume.id}/download`}
                      className="px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                    >
                      Download
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
                    No default resume uploaded
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Upload your resume to streamline your job applications.
                  </p>
                  <Link
                    href="/dashboard/resumes"
                    className="mt-3 inline-flex items-center text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:underline"
                  >
                    Upload Resume →
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
            <Link
              href="/dashboard/resumes"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Manage all resumes →
            </Link>
          </div>
        </div>

        {/* Applications Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-zinc-700 dark:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
                </svg>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  My Applications
                </h2>
              </div>
              <span className="text-xs text-zinc-500">
                {applicationsCount} total
              </span>
            </div>

            <div className="mt-4">
              {recentApplications.length > 0 ? (
                <div className="space-y-3">
                  {recentApplications.map((app) => (
                    <div
                      key={app.id}
                      className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-3">
                        <Link
                          href={`/jobs/${app.job.slug}`}
                          className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 hover:text-blue-600 block truncate"
                        >
                          {app.job.detailedTitle || app.job.title}
                        </Link>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {app.job.company.name} • {new Date(app.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                        {app.status.replace("_", " ")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
                    No applications submitted yet
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Apply directly to top tech companies and track your progress here.
                  </p>
                  <Link
                    href="/jobs"
                    className="mt-3 inline-flex items-center text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:underline"
                  >
                    Browse Jobs →
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
            <Link
              href="/dashboard/applications"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              View all applications →
            </Link>
          </div>
        </div>

        {/* Experience Summary Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-zinc-700 dark:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0M12 12.75h.008v.008H12v-.008z" />
                </svg>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Work Experience
                </h2>
              </div>
              <span className="text-xs text-zinc-500">
                {experienceCount} {experienceCount === 1 ? "position" : "positions"}
              </span>
            </div>

            <div className="mt-4">
              {experienceList.length > 0 ? (
                <div className="space-y-3">
                  {experienceList.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                            {exp.jobTitle}
                          </p>
                          <p className="text-xs text-zinc-600 dark:text-zinc-400">
                            {exp.companyName} {exp.location ? `• ${exp.location}` : ""}
                          </p>
                          <p className="text-xs text-zinc-400 mt-1">
                            {formatDate(exp.startDate)} – {exp.isCurrent ? "Present" : exp.endDate ? formatDate(exp.endDate) : ""}
                          </p>
                        </div>
                        {exp.isCurrent && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                            Current
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
                    No work experience added
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Showcase your employment history and accomplishments.
                  </p>
                  <Link
                    href="/dashboard/profile/experience"
                    className="mt-3 inline-flex items-center text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:underline"
                  >
                    Add Experience →
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
            <Link
              href="/dashboard/profile/experience"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Manage experience →
            </Link>
          </div>
        </div>

        {/* Education Summary Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-zinc-700 dark:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 00-.491 6.347A48.62 48.62 0 0112 20.904a48.62 48.62 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.636 50.636 0 00-2.658-.813A59.906 59.906 0 0112 3.493a59.903 59.903 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" />
                </svg>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Education History
                </h2>
              </div>
              <span className="text-xs text-zinc-500">
                {educationCount} {educationCount === 1 ? "entry" : "entries"}
              </span>
            </div>

            <div className="mt-4">
              {educationList.length > 0 ? (
                <div className="space-y-3">
                  {educationList.map((edu) => (
                    <div
                      key={edu.id}
                      className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-800"
                    >
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                        {edu.degree} {edu.fieldOfStudy ? `in ${edu.fieldOfStudy}` : ""}
                      </p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {edu.institution}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        {formatDate(edu.startDate)} – {edu.isCurrentlyStudying ? "Present" : edu.endDate ? formatDate(edu.endDate) : ""}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
                    No education records added
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Highlight your academic background and degrees.
                  </p>
                  <Link
                    href="/dashboard/profile/education"
                    className="mt-3 inline-flex items-center text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:underline"
                  >
                    Add Education →
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
            <Link
              href="/dashboard/profile/education"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Manage education →
            </Link>
          </div>
        </div>

        {/* Skills Summary Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-zinc-700 dark:text-zinc-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Skills & Expertise
                </h2>
              </div>
              <span className="text-xs text-zinc-500">
                {skillsCount} {skillsCount === 1 ? "skill" : "skills"}
              </span>
            </div>

            <div className="mt-4">
              {skillsList.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skillsList.map((item) => (
                    <span
                      key={item.skillId}
                      className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700"
                    >
                      {item.skill.name}
                    </span>
                  ))}
                  {skillsCount > skillsList.length && (
                    <span className="px-2.5 py-1 text-xs font-medium rounded-lg bg-zinc-50 dark:bg-zinc-800/50 text-zinc-500">
                      +{skillsCount - skillsList.length} more
                    </span>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg">
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-200">
                    No skills added yet
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    Select your technical and professional skills for matching.
                  </p>
                  <Link
                    href="/dashboard/profile/skills"
                    className="mt-3 inline-flex items-center text-xs font-semibold text-zinc-900 dark:text-zinc-100 hover:underline"
                  >
                    Add Skills →
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
            <Link
              href="/dashboard/profile/skills"
              className="text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Manage skills →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
