# Job Portal — Comprehensive Feature Audit Matrix

This matrix provides an evidence-based assessment of every capability in the codebase.
Statuses used:
- `IMPLEMENTED`: End-to-end working implementation verified (Backend + Frontend).
- `PARTIALLY IMPLEMENTED`: Workflow started or partially complete.
- `API ONLY`: Backend endpoint exists and functional, but no frontend interface exists.
- `UI ONLY`: Frontend interface exists without working backend logic.
- `DATABASE ONLY`: Database schema model exists without application/API logic.
- `NOT IMPLEMENTED`: No application code or schema found.
- `NEEDS TESTING`: Implementation exists, but requires live transactional verification.
- `BROKEN`: Confirmed defect in implementation.

---

## 1. Public Website & Public Job Discovery

| Feature | Status | Relevant File Paths | Existing Functionality | Missing Functionality | Bugs / Risks | Recommended Next Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Homepage** | IMPLEMENTED | `src/app/page.tsx` | SSR homepage with real-time stats, search bar, latest published jobs, popular categories, and verified hiring employers. Unauthenticated access verified. | None. | None. | Phase 1.1 Complete. |
| **Public Unauthenticated Browsing** | IMPLEMENTED | `src/proxy.ts`, `src/app/jobs/*`, `src/app/companies/*`, `src/app/categories/*` | Complete public access without session tokens across `/`, `/jobs`, `/jobs/[slug]`, `/companies`, `/companies/[slug]`, `/categories`, and `/categories/[slug]`. | None. | None. | Phase 1.1 Complete. |
| **Job Search & Listing** | IMPLEMENTED | `src/app/api/jobs/route.ts`, `src/app/jobs/page.tsx` | Multi-field search (`q`), filtering by `location`, `category`, `company`, `type`, `skill`, pagination, URL query preservation. `applicationMethod` included in select clause. | None. | None. | Phase 1.1 Complete. |
| **Job Details Page** | IMPLEMENTED | `src/app/api/jobs/[slug]/route.ts`, `src/app/jobs/[slug]/page.tsx` | Full specifications, company spotlight card, dynamic metadata, Google Jobs JSON-LD schema, interactive `JobApplyButton`. | None. | None. | Phase 1.1 Complete. |
| **External Apply Click Tracker API** | IMPLEMENTED | `src/app/api/jobs/[slug]/click/route.ts` | Dedicated rate-limited endpoint (30 req/min/IP), validates `applicationMethod === "EXTERNAL"`, checks deadline, validates HTTP/HTTPS URL, atomically increments `applyClickCount`. | None. | None. | Phase 1.1 Complete. |
| **Internal vs External Apply Access Flow**| IMPLEMENTED | `src/components/public/job-apply-button.tsx`, `src/components/auth/auth-modal.tsx` | External jobs track click and redirect immediately without auth; internal jobs trigger accessible login/register modal for guests preserving job destination; verified direct entry point for authenticated users. | None. | None. | Phase 1.1 Complete. |
| **Company Directory & Details** | IMPLEMENTED | `src/app/companies/page.tsx`, `src/app/companies/[slug]/page.tsx`, `src/app/api/companies/*` | Public searchable company directory and company profile view with verified employer badge, contact details, dynamic metadata, and open positions feed. | None. | None. | Phase 1.1 Complete. |
| **Category Directory & Details** | IMPLEMENTED | `src/app/categories/page.tsx`, `src/app/categories/[slug]/page.tsx`, `src/app/api/categories/*` | Public directory and detail view with active opening counts, search filter, dynamic metadata, and paginated job listings. | None. | None. | Phase 1.1 Complete. |
| **Public Skills Lookup API** | IMPLEMENTED | `src/app/api/skills/route.ts` | Query skills by prefix (`q`), limits to 20 results. Public. | Integrated with search filters. | Minimum 2 chars required. | Feature complete. |
| **SEO Metadata & OpenGraph** | IMPLEMENTED | `src/app/jobs/[slug]/page.tsx`, `src/app/companies/[slug]/page.tsx`, `src/app/categories/[slug]/page.tsx` | Server-side `generateMetadata()` on all public dynamic routes with OpenGraph tags, dynamic job titles, and Google Jobs JSON-LD structured schema. | Dynamic `sitemap.ts` and `robots.ts` (Phase 4). | None. | Core SEO complete for Phase 1.1. |

---

## 2. Authentication & User Management

| Feature | Status | Relevant File Paths | Existing Functionality | Missing Functionality | Bugs / Risks | Recommended Next Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Registration Flow** | IMPLEMENTED | `src/app/(auth)/register/page.tsx`, `src/app/(auth)/register/register-form.tsx`, `src/app/api/auth/register/*` | Full Name, Email, Role Picker (Candidate vs Recruiter), OTP input with auto-advance, Resend countdown (60s), rate-limited send/verify APIs. | None. | Role fixed to APPLICANT or RECRUITER at registration. | Feature complete for Phase 1. |
| **Login Flow** | IMPLEMENTED | `src/app/(auth)/login/page.tsx`, `src/app/(auth)/login/login-form.tsx`, `src/app/api/auth/login/*` | Email input, anti-enumeration send-otp, 6-digit OTP input with paste support, Resend countdown, safe role-based redirect. | None. | None. | Feature complete for Phase 1. |
| **Google OAuth Flow** | IMPLEMENTED | `src/app/api/auth/google/route.ts`, `src/app/api/auth/google/callback/route.ts`, `src/components/auth/google-sign-in-button.tsx` | Branded Google button on login & register, state cookie check, token exchange, safe role-based destination redirect, detailed error banners on `/login`. | None. | Auto-links to existing accounts with matching verified email. | Feature complete for Phase 1. |
| **Session Verification** | IMPLEMENTED | `src/lib/auth/session.ts`, `src/app/api/auth/me/route.ts` | SHA-256 session token verification, Server Component helper (`getServerSession`), API route helper (`getAuthenticatedUser`). | None. | None. | Feature complete for Phase 1. |
| **Logout** | IMPLEMENTED | `src/app/api/auth/logout/route.ts`, `src/components/auth/logout-button.tsx` | Revokes DB session token, clears session cookie, loading spinner state, redirects to `/login`. | None. | None. | Feature complete for Phase 1. |
| **Edge Route Protection (Proxy)** | IMPLEMENTED | `src/proxy.ts`, `src/app/dashboard/layout.tsx`, `src/app/recruiter/layout.tsx`, `src/app/admin/layout.tsx` | Next.js 16 Proxy convention: intercepts unauthenticated requests to `/dashboard/*`, `/recruiter/*`, `/admin/*`, preserving safe `?redirect=...`. Server layouts enforce authoritative DB session and cross-role boundaries. | None. | None. | Feature complete for Phase 1. |

---

## 3. Applicant Dashboard

| Feature | Status | Relevant File Paths | Existing Functionality | Missing Functionality | Bugs / Risks | Recommended Next Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **SSR Theme System** | IMPLEMENTED | `src/app/globals.css`, `src/app/layout.tsx`, `src/components/theme/*` | System / Light / Dark modes. SSR cookie persistence (`theme`), anti-FOUC script in `<head>`, live OS preference sync, accessible `ThemeToggle` in public and dashboard headers. | None. | None. | Phase 2 Complete. |
| **Candidate Profile Picture Upload & Cropping** | IMPLEMENTED | `src/app/api/me/profile/avatar/route.ts`, `src/lib/profile-picture-storage.ts`, `src/components/profile/profile-picture-cropper.tsx` | Local file upload, 1:1 interactive square crop modal (zoom slider, mouse/touch drag repositioning, live preview), private storage in `private/profile-pictures/`, magic-byte checks (JPEG, PNG, WebP; SVG rejected), private authenticated image streaming, atomic replacement and deletion. | None. | None. | Phase 2 Complete. |
| **Numeric Phone Number Field** | IMPLEMENTED | `src/app/api/me/profile/route.ts`, `src/app/dashboard/profile/profile-form.tsx` | Strict numeric-only validation: frontend `inputMode="numeric"`, `pattern="[0-9]*"`, input sanitization; backend regex `/^\d{7,15}$/` rejecting letters and special characters; preserves leading zeroes as string in database. | None. | None. | Phase 2 Complete. |
| **Dashboard Home UI** | IMPLEMENTED | `src/app/dashboard/page.tsx`, `src/components/dashboard/dashboard-nav.tsx`, `src/lib/applicant/profile-completion.ts` | Real-time profile completeness calculator, missing section checklist with direct links, avatar display, default resume card, recent experience, education, and skills summary widgets. | None. | None. | Phase 2 Complete. |
| **Profile API & Form** | IMPLEMENTED | `src/app/api/me/profile/route.ts`, `src/app/dashboard/profile/page.tsx`, `src/app/dashboard/profile/profile-form.tsx` | View profile, update full name (User), phone, headline, bio, location, and social links with client and server validations. Integrated ProfilePictureCropper. | None. | None. | Phase 2 Complete. |
| **Education CRUD & UI** | IMPLEMENTED | `src/app/api/me/education/route.ts`, `src/app/api/me/education/[id]/route.ts`, `src/app/dashboard/profile/education/*` | Chronological list, add/edit modal with date validations, currently studying toggle, confirmation before deletion, responsive cards. | None. | None. | Phase 2 Complete. |
| **Experience CRUD & UI** | IMPLEMENTED | `src/app/api/me/experience/route.ts`, `src/app/api/me/experience/[id]/route.ts`, `src/app/dashboard/profile/experience/*` | Chronological list, add/edit modal with employment types, current position toggle, date validation, delete confirmation. | None. | None. | Phase 2 Complete. |
| **Skills Management API & UI** | IMPLEMENTED | `src/app/api/me/skills/route.ts`, `src/app/api/me/skills/[skillId]/route.ts`, `src/app/dashboard/profile/skills/*` | Interactive skill tag manager, autocomplete lookup (`/api/skills?q=...`), instant addition, duplicate prevention, chip deletion. | None. | None. | Phase 2 Complete. |
| **Skill Suggestion API & UI** | IMPLEMENTED | `src/app/api/me/skill-suggestions/route.ts`, `src/app/dashboard/profile/skills/skills-manager.tsx` | Suggest new custom skill dialog, validation, status tracking list (PENDING, APPROVED, REJECTED). | Admin moderation approval UI (Phase 5). | None. | Ready for admin review in Phase 5. |
| **Resume Upload API & UI** | IMPLEMENTED | `src/app/api/me/resumes/route.ts`, `src/app/dashboard/resumes/*` | Drag-and-drop zone, file size (5MB) and mime/magic-byte checks, optional title, default resume setting. | None. | None. | Phase 2 Complete. |
| **Resume Download / Stream API & UI** | IMPLEMENTED | `src/app/api/me/resumes/[id]/download/route.ts`, `src/app/dashboard/resumes/resume-manager.tsx` | Authenticated file streaming with filename sanitization and integrity check; secure download action on cards. | None. | None. | Phase 2 Complete. |
| **Resume Edit & Two-Phase Delete** | IMPLEMENTED | `src/app/api/me/resumes/[id]/route.ts`, `src/app/dashboard/resumes/resume-manager.tsx` | Set as default action, two-phase atomic file deletion with confirmation modal and fallback default assignment. | None. | None. | Phase 2 Complete. |
| **Saved Jobs API** | API ONLY | `src/app/api/me/saved-jobs/route.ts`, `src/app/api/me/saved-jobs/[jobId]/route.ts` | GET paginated saved jobs with live availability badges; POST save; DELETE unsave. | Bookmark button on job cards; saved jobs tab. | None. | Build Saved Jobs page (`/dashboard/saved-jobs`) & bookmark buttons (Phase 4). |
| **Job Application Submission** | IMPLEMENTED | `src/app/api/jobs/[slug]/apply/route.ts`, `src/components/public/job-apply-modal.tsx`, `src/components/public/job-apply-button.tsx` | Enforces `APPLICANT` role, validates job status/deadline/INTERNAL method, verifies user's resume ownership and physical existence, captures full immutable profile snapshot (contact, bio, headline, education, experience, skills), copies resume to `private/application-resumes/`, prevents duplicates (409), increments `applicationCount`, creates `ApplicationStatusHistory`. | None. | None. | Phase 4 Complete. |
| **Applicant Application History** | IMPLEMENTED | `src/app/api/me/applications/route.ts`, `src/app/api/me/applications/[id]/route.ts`, `src/app/dashboard/applications/page.tsx`, `src/app/dashboard/applications/applications-manager.tsx` | Full candidate application dashboard with status tabs, search filter, pagination, snapshot detail modal, submitted resume viewer, and status timeline. | None. | None. | Phase 4 Complete. |
| **Application Withdrawal** | IMPLEMENTED | `src/app/api/me/applications/[id]/withdraw/route.ts`, `src/lib/application-lifecycle.ts`, `src/app/dashboard/applications/applications-manager.tsx` | Allows candidate to withdraw active applications (`SUBMITTED`, `UNDER_REVIEW`, `SHORTLISTED`), records reason in `ApplicationStatusHistory`, locks further recruiter transitions. | None. | None. | Phase 4 Complete. |

---

## 4. Recruiter Management & Dashboard

| Feature | Status | Relevant File Paths | Existing Functionality | Missing Functionality | Bugs / Risks | Recommended Next Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Recruiter Registration & Onboarding** | IMPLEMENTED | `src/app/recruiter/onboarding/page.tsx`, `src/app/recruiter/onboarding/onboarding-form.tsx`, `src/app/api/recruiter/company/route.ts` | Multi-step role detection, automated redirect to corporate onboarding if no company, atomic company + OWNER creation. | None. | None. | Phase 3 Complete. |
| **Company Creation & Management** | IMPLEMENTED | `src/app/recruiter/company/page.tsx`, `src/app/recruiter/company/company-form.tsx`, `src/app/api/recruiter/company/route.ts` | Complete company profile editor, schema length constraints enforced (VarChar 300 overview), verification status indicators. | None. | None. | Phase 3 Complete. |
| **Company Logo Upload & Streaming** | IMPLEMENTED | `src/lib/company-logo-storage.ts`, `src/app/api/recruiter/company/logo/route.ts`, `src/app/api/companies/[slug]/logo/route.ts` | Private disk storage in `private/company-logos/`, magic-byte checks (JPEG, PNG, WebP; SVG rejected), 5MB cap, public streaming with ETag and 304 Not Modified. | None. | None. | Phase 3 Complete. |
| **Company Team Management** | IMPLEMENTED | `src/app/recruiter/team/page.tsx`, `src/app/recruiter/team/team-manager.tsx`, `src/app/api/recruiter/team/route.ts`, `src/app/api/recruiter/team/[recruiterId]/route.ts` | List team members, add registered user by email as RECRUITER or ADMIN, auto-promote applicant role, remove member guard (protects Owner & self). | Out-of-band email delivery tokens for unregistered individuals. | Pending transactional email template integration. | Phase 3 Complete; external email invites in Phase 9. |
| **Recruiter Dashboard Overview** | IMPLEMENTED | `src/app/recruiter/dashboard/page.tsx`, `src/app/recruiter/layout.tsx`, `src/components/recruiter/recruiter-nav.tsx` | Dedicated recruiter workspace with responsive navigation, metrics cards (active, draft, applications, clicks), quick links, recent jobs. | None. | None. | Phase 3 Complete. |
| **Job Creation Wizard** | IMPLEMENTED | `src/app/recruiter/jobs/new/page.tsx`, `src/app/recruiter/jobs/new/job-wizard.tsx`, `src/app/api/recruiter/jobs/route.ts` | 5-step wizard (Basic Info, Description & Skills, Compensation, Routing [INTERNAL/EXTERNAL/EMAIL], Review & Publish) with draft save & instant publishing. | None. | None. | Phase 3 Complete. |
| **Job Management (CRUD)** | IMPLEMENTED | `src/app/recruiter/jobs/page.tsx`, `src/app/recruiter/jobs/jobs-manager.tsx`, `src/app/recruiter/jobs/[id]/edit/page.tsx`, `src/app/api/recruiter/jobs/[id]/route.ts` | Status tabs (All, Published, Draft, Closed, Expired), keyword search, pagination, quick publish, quick close, delete draft, full editor with cross-company isolation. | None. | None. | Phase 3 Complete. |
| **Applicant Listing for Job** | IMPLEMENTED | `src/app/api/recruiter/jobs/[id]/applications/route.ts`, `src/app/recruiter/jobs/[id]/applications/page.tsx`, `src/app/recruiter/jobs/[id]/applications/candidates-manager.tsx` | Dedicated ATS candidate pipeline page, status filter tabs, candidate search, pagination, multi-tenant company isolation. | None. | None. | Phase 4 Complete. |
| **Applicant Resume Access for Recruiter** | IMPLEMENTED | `src/app/api/recruiter/applications/[id]/resume/route.ts`, `src/lib/application-storage.ts` | Authorized recruiter resume streaming from `private/application-resumes/` with cross-company multi-tenant verification and security headers. | None. | None. | Phase 4 Complete. |
| **Application Status Updates / Pipeline**| IMPLEMENTED | `src/app/api/recruiter/applications/[id]/status/route.ts`, `src/lib/application-lifecycle.ts`, `src/app/recruiter/jobs/[id]/applications/candidates-manager.tsx` | Recruiter candidate review modal, allowed status transitions validation, candidate feedback/reason logging, full `ApplicationStatusHistory` audit trail, and notification dispatch. | None. | None. | Phase 4 Complete. |

---

## 5. Platform Administration & Moderation

| Feature | Status | Relevant File Paths | Existing Functionality | Missing Functionality | Bugs / Risks | Recommended Next Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Admin Authentication & RBAC** | DATABASE ONLY | `prisma/schema.prisma` | UserRole `ADMIN` exists in database enum. | Dedicated admin auth guard, admin dashboard layout, admin middleware. | No admin routes exist; superuser functions completely inaccessible. | Create admin middleware guard and `/admin` layout. |
| **Platform Analytics Dashboard** | NOT IMPLEMENTED | None | None. | Counts of total users, active jobs, applications, pending verifications. | Zero platform visibility for administrators. | Build `/api/admin/overview` and analytics UI. |
| **Company Verification Management** | DATABASE ONLY | `prisma/schema.prisma` | Status: `UNVERIFIED`, `PENDING`, `VERIFIED`, `REJECTED`. | Admin list pending companies, approve/reject verification API and UI. | Unverified companies cannot be officially audited. | Create company moderation API and admin verification table. |
| **Job Post Moderation** | DATABASE ONLY | `prisma/schema.prisma` | Status: `DRAFT`, `PENDING_REVIEW`, `PUBLISHED`, `REJECTED`, `EXPIRED`, `CLOSED`. | Admin approve/reject jobs API; list pending review jobs. | Spam or harmful job posts cannot be moderated. | Build job moderation review queue. |
| **Skill Suggestion Moderation** | DATABASE ONLY | `prisma/schema.prisma` | Status: `PENDING`, `APPROVED`, `REJECTED`. | Admin API to approve (promotes to `Skill` table) or reject suggestions. | User suggestions accumulate in DB indefinitely without approval. | Implement `POST /api/admin/skill-suggestions/[id]/approve` and reject routes. |
| **Category Management** | DATABASE ONLY | `prisma/schema.prisma` | Model `Category` exists. | Admin CRUD for categories (create new industry category, toggle active, sortOrder). | New categories can currently only be created via database seed/script. | Build admin category management UI and API. |
| **User & Access Moderation** | DATABASE ONLY | `prisma/schema.prisma` | `isActive` boolean on `User` table. | Admin view users, deactivate malicious accounts, view audit logs. | Malicious accounts cannot be suspended via interface. | Build admin user management portal. |

---

## 6. Notifications & Communications

| Feature | Status | Relevant File Paths | Existing Functionality | Missing Functionality | Bugs / Risks | Recommended Next Action |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Transactional Email Delivery** | PARTIALLY IMPLEMENTED | `src/lib/resend.ts` | Function `sendOtpEmail` sends HTML/text OTP codes. | Application confirmation email, recruiter notification on new applicant, status update email. | Candidates receive no feedback after submitting applications. | Expand `resend.ts` with branded application status email templates. |
| **In-App Notifications** | NOT IMPLEMENTED | None | None. | Notification database model, notification bell UI, unread count API. | Users have no real-time activity alerts inside portal. | Plan notification model and push/polling service in Phase 9. |
