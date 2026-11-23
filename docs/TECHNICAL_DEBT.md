# Job Portal — Technical Debt & Refactoring Log

## 1. Executive Summary
This document catalogs defects, architectural redundancies, dead code, refactoring targets, and performance bottlenecks identified during the comprehensive audit.

---

## 2. Incomplete Workflows & Logic Bugs

| ID | Issue Description | Location | Impact | Remediation Plan |
| :--- | :--- | :--- | :--- | :--- |
| **BUG-01** | **Apply Route Ignores Uploaded Private Resumes** | `src/app/api/jobs/[slug]/apply/route.ts` | Applicants must provide an external HTTP/HTTPS URL string. Cannot select from their securely uploaded resumes. | **Resolved in Phase 4**: Accepts `resumeId`, verifies ownership, takes profile snapshot, copies file into `private/application-resumes/`. |
| **BUG-02** | **Recruiters Cannot Download Uploaded Resumes** | `src/app/api/recruiter/jobs/[id]/applications/route.ts` | Recruiter applicants endpoint only returns `resumeUrl` string. Resume download endpoint forbids recruiters. | **Resolved in Phase 4**: Created `/api/recruiter/applications/[id]/resume` verifying company membership. |
| **BUG-03** | **Missing `/login` Page on Redirects** | `src/components/auth/logout-button.tsx`, `src/app/api/auth/google/callback/route.ts` | Logout button redirects to `/login`. Google error redirects to `/login?error=...`. Page does not exist (404). | **Resolved in Phase 1**: Built standard `/login` and `/register` pages. |
| **BUG-04** | **Google OAuth Callback Redirects to Root** | `src/app/api/auth/google/callback/route.ts:217` | After successful Google authentication, user is redirected to `/` instead of user dashboard. | **Resolved in Phase 1**: Redirects based on role (`/dashboard` for applicant, `/recruiter/dashboard` for recruiter). |
| **BUG-05** | **No Application Withdrawal Endpoint** | `src/app/api/me/applications/[id]/withdraw/route.ts` | Schema has `ApplicationStatus.WITHDRAWN`, but no API endpoint exists to update status. | **Resolved in Phase 4**: Implemented `POST /api/me/applications/[id]/withdraw` with audit logging. |
| **BUG-06** | **Unpaginated Recruiter Applications** | `src/app/api/recruiter/jobs/[id]/applications/route.ts` | Query uses `findMany` with no `take` or `skip`. High-volume job postings will degrade memory and latency. | **Resolved in Phase 4**: Implemented `page`, `limit`, status filter, search query, and pagination metadata. |
| **BUG-07** | **Unpaginated Public Companies Endpoint** | `src/app/api/companies/route.ts` | Queries all companies in database with job count aggregation without pagination. | Add `page` and `limit` query parameters with max 50 items. |
| **BUG-08** | **Inconsistent Database Environment Variable Naming** | `prisma/seed.ts` vs `src/lib/prisma.ts` | `seed.ts` checks `DATABASE_HOST`, `DATABASE_USER`, etc., while `prisma.ts` checks `DB_HOST`, `DB_USER`. | Standardize environment variable keys across all files to `DB_*`. |
| **BUG-09** | **Hardcoded Admin CUID in Seed Script** | `prisma/seed-jobs.ts:5` | `const ADMIN_ID = "cmw76j3zd0006ycf9t1eyx516";` is hardcoded. Seeding fails if local database has different user ID. | Query admin dynamically by `where: { role: "ADMIN" }`. |

---

## 3. Dead Code & Duplicated Logic

### 3.1 Unused Duplicate Resume Storage Utility
- **Location**: `src/lib/storage/resume-storage.ts`
- **Analysis**:
  - The repository contains two resume storage files:
    1. `src/lib/resume-storage.ts`: Active, comprehensive implementation (contains magic-byte inspection for PDF/DOC/DOCX, two-phase deletion staging, and path generators).
    2. `src/lib/storage/resume-storage.ts`: Redundant, legacy implementation without magic-byte validation.
  - Zero files import from `@/lib/storage/resume-storage`.
- **Action**: Delete `src/lib/storage/resume-storage.ts` to prevent developer confusion.

### 3.2 Duplicate Current User Endpoints
- **Location**: `src/app/api/auth/me/route.ts` and `src/app/api/me/route.ts`
- **Analysis**:
  - Both routes return the authenticated user's session data.
  - `/api/auth/me` manually inspects the cookie and queries `prisma.session`.
  - `/api/me` calls `getAuthenticatedUser(request)` and queries `prisma.user`.
  - Both return different JSON payload structures.
- **Action**: Consolidate into `/api/auth/me` for session status and leave `/api/me/profile` for profile attributes.

---

## 4. Refactoring Opportunities

### 4.1 Boilerplate Auth & Role Verification
- **Current State**:
  Multiple API handlers repeatedly re-implement session token hashing, database lookup, expiration checks, and role comparisons manually (e.g. `src/app/api/jobs/[slug]/apply/route.ts`, `src/app/api/recruiter/jobs/[slug]/applications/route.ts`).
- **Target Architecture**:
  Create reusable higher-order guard utilities:
  ```ts
  // src/lib/auth/guards.ts
  export async function requireApplicant(request: NextRequest) {
    const user = await getAuthenticatedUser(request);
    if (!user) throw new AuthError("Unauthorized", 401);
    if (user.role !== "APPLICANT") throw new AuthError("Forbidden", 403);
    return user;
  }

  export async function requireActiveRecruiter(request: NextRequest, companyId?: string) {
    // Authenticates recruiter and validates active company membership
  }
  ```

### 4.2 Centralized Response & Error Envelope
- **Current State**: Handlers define local `errorResponse()` functions with varying keys (`message` vs `error`).
- **Target Architecture**: Standardize `src/lib/api-response.ts` with `apiSuccess(data, message, pagination)` and `apiError(message, status)`.

---

## 5. Performance & Build Optimization

### 5.1 Dynamic Filesystem Access Tracing Warning (Turbopack)
- **Warning**:
  `./src/lib/resume-storage.ts:26:10 Warning: Dynamic filesystem access causes tracing of the whole project.`
- **Cause**: Resolving `process.env.RESUME_STORAGE_PATH || "./private/resumes"` dynamically causes Next.js Turbopack tracer to bundle parent project directory contents.
- **Remediation**:
  Scope storage path statically to `path.join(process.cwd(), "private", "resumes")` or add `/* turbopackIgnore: true */`.

### 5.2 Search Query Performance on MariaDB
- **Issue**: `src/app/api/jobs/route.ts` performs multiple `contains` filters across text fields and JSON arrays (`skills`, `keywords`).
- **Risk**: On datasets exceeding 10,000 jobs, table scans without dedicated full-text indexes will cause noticeable query latency.
- **Remediation**:
  In Phase 10, add MySQL/MariaDB Full-Text indexes on `(title, description, shortDescription, role, location)` and query via full-text search syntax.
