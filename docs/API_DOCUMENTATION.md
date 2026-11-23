# Job Portal — Comprehensive API Documentation

This document specifies all 32 existing API endpoints in the Job Portal application.

---

## Global Standards & Conventions
- **Base URL**: `/api`
- **Request Format**: `application/json` (or `multipart/form-data` for file uploads)
- **Response Format**: `application/json` (except binary file downloads)
- **Standard Envelope**:
  ```json
  {
    "success": true,
    "message": "Optional human-readable message",
    "data": {},
    "pagination": {}
  }
  ```
- **Authentication**: Opaque session token stored in HTTP-only, secure (production), SameSite=Lax cookie named `session`.

---

## 1. Authentication Endpoints

### 1.1 POST `/api/auth/register/send-otp`
Sends a 6-digit registration OTP to the applicant's or recruiter's email.
- **Auth Required**: No (Public)
- **Rate Limit**: 5 requests per 15 min per IP; 3 requests per 15 min per email; 60s resend cooldown.
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "APPLICANT" // "APPLICANT" | "RECRUITER"
  }
  ```
- **Responses**:
  - `200 OK`: `{"success": true, "message": "Registration OTP sent successfully.", "expiresIn": 600, "resendAfter": 60}`
  - `400 Bad Request`: Validation failure (name length, invalid email, invalid role).
  - `409 Conflict`: `{"success": false, "message": "An account with this email already exists."}`
  - `429 Too Many Requests`: Rate limit reached or within 60s cooldown.
  - `502 Bad Gateway`: Resend email provider delivery failure.

### 1.2 POST `/api/auth/register/verify-otp`
Verifies OTP, registers user, creates session, and sets session cookie.
- **Auth Required**: No (Public)
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "otp": "123456",
    "role": "APPLICANT"
  }
  ```
- **Responses**:
  - `200 OK` (Sets cookie `session`):
    ```json
    {
      "success": true,
      "message": "Registration successful.",
      "user": {
        "id": "cm...",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "role": "APPLICANT",
        "emailVerifiedAt": "2026-11-20T12:00:00.000Z"
      },
      "expiresAt": "2026-11-27T12:00:00.000Z"
    }
    ```
  - `400 Bad Request`: Invalid OTP or maximum attempts (5) reached. Returns remaining attempts.
  - `409 Conflict`: User with email already exists.

### 1.3 POST `/api/auth/login/send-otp`
Sends a 6-digit login verification OTP.
- **Auth Required**: No (Public)
- **Security Feature**: Returns generic 200 OK even if email is non-existent/inactive to prevent account enumeration.
- **Request Body**:
  ```json
  {
    "email": "jane@example.com"
  }
  ```
- **Responses**:
  - `200 OK`: `{"success": true, "message": "If an active account exists with this email, an OTP will be sent.", "expiresIn": 600, "resendAfter": 60}`
  - `400 Bad Request`: Invalid email format.
  - `429 Too Many Requests`: Rate limit exceeded.

### 1.4 POST `/api/auth/login/verify-otp`
Verifies login OTP, issues session token, and sets session cookie.
- **Auth Required**: No (Public)
- **Request Body**:
  ```json
  {
    "email": "jane@example.com",
    "otp": "123456"
  }
  ```
- **Responses**:
  - `200 OK` (Sets cookie `session`):
    ```json
    {
      "success": true,
      "message": "Login successful.",
      "user": {
        "id": "cm...",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "role": "APPLICANT",
        "emailVerifiedAt": "2026-11-20T12:00:00.000Z"
      },
      "expiresAt": "2026-11-27T12:00:00.000Z"
    }
    ```
  - `400 Bad Request`: Invalid or expired OTP.

### 1.5 GET `/api/auth/google`
Initiates Google OAuth 2.0 OpenID Connect authorization code flow.
- **Auth Required**: No (Public)
- **Query Parameters**: None
- **Responses**:
  - `302 Found`: Redirects to Google Accounts authorization page with state cookie `google_oauth_state`.

### 1.6 GET `/api/auth/google/callback`
Handles OAuth 2.0 authorization code return from Google.
- **Auth Required**: No (Public)
- **Query Parameters**: `code`, `state`
- **Cookies Required**: `google_oauth_state`
- **Responses**:
  - `302 Found` to `/`: Successful authentication (Sets cookie `session`).
  - `302 Found` to `/login?error=...`: State mismatch, token failure, inactive account, or account conflict.

### 1.7 POST `/api/auth/logout`
Revokes current active session token and clears cookie.
- **Auth Required**: Optional (Graceful no-op if no session present).
- **Responses**:
  - `200 OK`: `{"success": true, "message": "Logged out successfully."}`

### 1.8 GET `/api/auth/me`
Fetches current authenticated user session metadata.
- **Auth Required**: Yes (Session cookie)
- **Responses**:
  - `200 OK`: `{"success": true, "user": {"id": "...", "name": "...", "email": "...", "role": "...", "isActive": true, "emailVerifiedAt": "..."}, "session": {"expiresAt": "..."}}`
  - `401 Unauthorized`: Missing, expired, or revoked session.

---

## 2. Public Directory Endpoints

### 2.1 GET `/api/jobs`
Searches and filters active published jobs with deadlines in the future.
- **Auth Required**: No (Public)
- **CORS Allowed**: Yes (Reflects allowed origins)
- **Query Parameters**:
  - `q`: Search terms (splits up to 8 keywords, checks title, description, company, skills, keywords).
  - `skill`: Filter by specific skill.
  - `company`: Filter by company name.
  - `category`: Filter by category name.
  - `location`: Filter by location string.
  - `type`: `FULL_TIME` | `PART_TIME` | `CONTRACT` | `INTERNSHIP`.
  - `page`: Integer (default: 1).
  - `limit`: Integer (1-50, default: 10).
- **Responses**:
  - `200 OK`: Returns filters, pagination summary, count, and array of job summaries with embedded company & category objects.
  - `400 Bad Request`: Invalid employment type.
- **Note on Implementation Gap**: The current select clause projects `id, slug, title, shortDescription, role, location, employmentType, experienceLevel, experienceYears, salaryMin, salaryMax, salaryCurrency, salaryPeriod, skills, keywords, publishedAt, deadline, company, category`. It **must be updated in Phase 1.1** to include `applicationMethod` so client listings can distinguish internal vs. external jobs.

### 2.2 GET `/api/jobs/[slug]`
Retrieves full details of a published job.
- **Auth Required**: No (Public)
- **Path Parameter**: `slug` (Job unique slug)
- **Responses**:
  - `200 OK`: Complete job object including qualifications, skills JSON, company details, SEO tags, `applicationMethod` (`INTERNAL` | `EXTERNAL` | `EMAIL`), `applicationUrl`, `allowGuestApply`, `applicationCount`, and `applyClickCount`.
  - `404 Not Found`: Non-existent or unpublished/expired job.

### 2.8 POST `/api/jobs/[slug]/click` (Planned — Phase 1.1)
Increments external job application click metric (`applyClickCount`).
- **Auth Required**: No (Public)
- **Path Parameter**: `slug` (Job unique slug)
- **Responses**:
  - `200 OK`: `{"success": true, "message": "Apply click recorded.", "data": {"applyClickCount": 12, "applicationUrl": "https://company.com/careers/123"}}`
  - `400 Bad Request`: Job is not configured with `applicationMethod === "EXTERNAL"` or missing URL.
  - `404 Not Found`: Job not found or not published.

### 2.3 GET `/api/companies`
Lists all registered companies ordered alphabetically.
- **Auth Required**: No (Public)
- **Responses**:
  - `200 OK`: Returns company list with overview, industry, logo, website, verification status, and published `jobCount`.

### 2.4 GET `/api/companies/[slug]`
Retrieves single company profile and its paginated active published jobs.
- **Auth Required**: No (Public)
- **Path Parameter**: `slug` (Company unique slug)
- **Query Parameters**: `page` (default 1), `limit` (default 10, max 50).
- **Responses**:
  - `200 OK`: Returns company details, rating, pagination, and job items.
  - `404 Not Found`: Company not found.

### 2.5 GET `/api/categories`
Lists all active categories with active job count, ordered by `sortOrder`.
- **Auth Required**: No (Public)
- **Responses**:
  - `200 OK`: Array of category objects with `jobCount`.

### 2.6 GET `/api/categories/[slug]`
Retrieves category details and its paginated active published jobs.
- **Auth Required**: No (Public)
- **Path Parameter**: `slug` (Category unique slug)
- **Query Parameters**: `page` (default 1), `limit` (default 10, max 50).
- **Responses**:
  - `200 OK`: Category details, pagination, and job items.
  - `404 Not Found`: Category not found.

### 2.7 GET `/api/skills`
Lookup existing skills for auto-complete.
- **Auth Required**: No (Public)
- **Query Parameters**: `q` (Search query, min 2 chars, max 100 chars).
- **Responses**:
  - `200 OK`: `{"success": true, "message": "...", "data": [{"id": "...", "name": "..."}]}` (up to 20 matches).

---

## 3. Applicant Endpoints (`/api/me/*`)

### 3.1 GET `/api/me`
Retrieves authenticated user record.
- **Auth Required**: Yes
- **Responses**:
  - `200 OK`: `{"success": true, "data": User}`

### 3.2 GET `/api/me/profile`
Retrieves applicant user profile.
- **Auth Required**: Yes (`APPLICANT` role only)
- **Responses**:
  - `200 OK`: Profile details (phone, headline, bio, location, profileImage, socials array).

### 3.3 PATCH `/api/me/profile`
Updates or upserts applicant profile and user name.
- **Auth Required**: Yes (`APPLICANT` role only)
- **Validation Requirements**:
  - `name`: String, 2-150 characters.
  - `phone`: String, strictly numeric digits (`0-9`), 7-20 characters. Reject all alpha characters, hyphens, and whitespace. Stored as string to preserve leading zeroes.
  - `headline`: String <= 200 characters or null.
  - `bio`: String <= 5000 characters or null.
  - `location`: String <= 150 characters or null.
  - `profileImage`: Valid HTTP/HTTPS URL or internal reference string.
  - `socials`: Array of `{ name, url }` with HTTP/HTTPS protocols.
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "phone": "09876543210",
    "headline": "Full Stack Software Engineer",
    "bio": "Experienced developer...",
    "location": "Bengaluru, India",
    "profileImage": "https://example.com/photo.jpg",
    "socials": [
      {"name": "GitHub", "url": "https://github.com/username"},
      {"name": "LinkedIn", "url": "https://linkedin.com/in/username"}
    ]
  }
  ```
- **Responses**:
  - `200 OK`: Updated profile object with updated `user` details.
  - `400 Bad Request`: Invalid fields, non-numeric phone, name length, URL schema, or payload size.

### 3.3.1 POST `/api/me/profile/avatar`
Uploads, crops, and stores a private 1:1 candidate profile picture.
- **Auth Required**: Yes (`APPLICANT` role only)
- **Request Format**: `multipart/form-data`
- **Fields**:
  - `avatar` or `file`: Binary image file (JPEG, PNG, WebP only, max 5 MB).
- **Backend Behavior**:
  - Validates binary magic-byte signatures (`FF D8 FF`, `89 50 4E 47`, `RIFF...WEBP`). Explicitly rejects SVG, HTML, and executables.
  - Generates safe UUID storage key (e.g. `uuid.webp`).
  - Writes to `private/profile-pictures/`.
  - Updates `UserProfile.profileImage` with internal storage key.
  - Safe replacement: Deletes previous avatar file only after database commit succeeds. Rolls back and cleans up staged file on failure.
- **Responses**:
  - `200 OK`: `{"success": true, "message": "Profile picture uploaded and updated successfully.", "data": {"avatarUrl": "/api/me/profile/avatar"}}`
  - `400 Bad Request`: Invalid file type, file size > 5MB, or corrupted image.

### 3.3.2 GET `/api/me/profile/avatar`
Streams the authenticated candidate's private profile picture.
- **Auth Required**: Yes
- **Responses**:
  - `200 OK`: Binary image data with `Content-Type: image/jpeg|png|webp`, `Cache-Control: private, max-age=3600, must-revalidate`, `X-Content-Type-Options: nosniff`.
  - `404 Not Found`: No profile picture exists for authenticated user.

### 3.3.3 DELETE `/api/me/profile/avatar`
Safely removes the candidate's profile picture and deletes file from disk.
- **Auth Required**: Yes (`APPLICANT` role only)
- **Responses**:
  - `200 OK`: `{"success": true, "message": "Profile picture removed successfully."}`
  - `404 Not Found`: No profile picture uploaded.

### 3.4 GET `/api/me/education`
Lists applicant education history ordered by `startDate desc`.
- **Auth Required**: Yes (`APPLICANT` role only)
- **Responses**:
  - `200 OK`: Array of education records.

### 3.5 POST `/api/me/education`
Creates a new education entry.
- **Auth Required**: Yes (`APPLICANT` role only)
- **Request Body**:
  ```json
  {
    "institution": "University of Technology",
    "degree": "B.Tech in Computer Science",
    "fieldOfStudy": "Software Engineering",
    "startDate": "2020-08-01",
    "endDate": "2024-05-31",
    "isCurrentlyStudying": false,
    "grade": "8.5 CGPA",
    "description": "Graduated with honors."
  }
  ```
- **Responses**:
  - `201 Created`: Created education record.
  - `400 Bad Request`: Validation failure (date logic, missing fields).

### 3.6 PATCH `/api/me/education/[id]`
Updates an existing education record.
- **Auth Required**: Yes (`APPLICANT` role only, scoped to record owner)
- **Responses**:
  - `200 OK`: Updated record.
  - `404 Not Found`: Record not found or not owned by user.

### 3.7 DELETE `/api/me/education/[id]`
Deletes an education record.
- **Auth Required**: Yes (`APPLICANT` role only, scoped to record owner)
- **Responses**:
  - `200 OK`: `{"success": true, "message": "Education deleted successfully"}`
  - `404 Not Found`: Record not found.

### 3.8 GET `/api/me/experience`
Lists work experience entries ordered by `startDate desc`.
- **Auth Required**: Yes (`APPLICANT` role only)
- **Responses**:
  - `200 OK`: Array of work experience records.

### 3.9 POST `/api/me/experience`
Creates a work experience record.
- **Auth Required**: Yes (`APPLICANT` role only)
- **Request Body**:
  ```json
  {
    "companyName": "Acme Corp",
    "jobTitle": "Frontend Engineer",
    "employmentType": "FULL_TIME",
    "location": "Remote",
    "startDate": "2024-06-01",
    "endDate": null,
    "isCurrent": true,
    "description": "Developed Next.js web applications."
  }
  ```
- **Responses**:
  - `201 Created`: Created experience record.

### 3.10 PATCH `/api/me/experience/[id]`
Updates an existing work experience record.
- **Auth Required**: Yes (`APPLICANT` role only, scoped to record owner)

### 3.11 DELETE `/api/me/experience/[id]`
Deletes an experience record.
- **Auth Required**: Yes (`APPLICANT` role only, scoped to record owner)

### 3.12 GET `/api/me/skills`
Lists all skills associated with applicant.
- **Auth Required**: Yes (`APPLICANT` role only)
- **Responses**:
  - `200 OK`: Array of user skills with skill names and slugs.

### 3.13 POST `/api/me/skills`
Associates skills to user.
- **Auth Required**: Yes (`APPLICANT` role only)
- **Request Body**: `{"skillIds": ["skill_id_1", "skill_id_2"]}`
- **Responses**:
  - `200 OK`: Added count, skipped count, and complete skill list.

### 3.14 DELETE `/api/me/skills/[skillId]`
Removes a skill from applicant.
- **Auth Required**: Yes (`APPLICANT` role only)

### 3.15 GET `/api/me/skill-suggestions`
Lists custom skills suggested by applicant.
- **Auth Required**: Yes (`APPLICANT` role only)

### 3.16 POST `/api/me/skill-suggestions`
Submits a new skill name for administrator review.
- **Auth Required**: Yes (`APPLICANT` role only)
- **Request Body**: `{"name": "FastAPI"}`
- **Responses**:
  - `201 Created`: Suggestion with status `PENDING`.
  - `409 Conflict`: Skill already exists or already pending review.

### 3.17 GET `/api/me/resumes`
Lists all resumes uploaded by applicant.
- **Auth Required**: Yes (`APPLICANT` role only)
- **Responses**:
  - `200 OK`: Array of resume items (title, fileName, mimeType, fileSize, isDefault, createdAt).

### 3.18 POST `/api/me/resumes`
Uploads a resume file (Multipart form).
- **Auth Required**: Yes (`APPLICANT` role only)
- **Payload**: `FormData` containing `file` (PDF, DOC, DOCX up to 5MB), optional `title`, optional `isDefault` (`true` | `false`).
- **Responses**:
  - `201 Created`: Uploaded resume metadata record.
  - `400 Bad Request`: Size exceeded, bad file extension, or failed magic-byte inspection.

### 3.19 PATCH `/api/me/resumes/[id]`
Updates resume title or sets it as default.
- **Auth Required**: Yes (`APPLICANT` role only, owner-scoped)
- **Request Body**: `{"title": "Updated Resume", "isDefault": true}`
- **Responses**:
  - `200 OK`: Updated resume object.

### 3.20 DELETE `/api/me/resumes/[id]`
Deletes resume from database and unlinks staged local file.
- **Auth Required**: Yes (`APPLICANT` role only, owner-scoped)
- **Responses**:
  - `200 OK`: Deleted confirmation. Auto-promotes next newest resume to default if deleted resume was default.

### 3.21 GET `/api/me/resumes/[id]/download`
Securely streams resume file to authorized owner.
- **Auth Required**: Yes (`APPLICANT` role only, owner-scoped)
- **Responses**:
  - `200 OK`: Binary file stream with `Content-Disposition: attachment; filename="..."` and `Content-Security-Policy: sandbox`.
  - `404 Not Found`: Resume missing or unlinked.

### 3.22 GET `/api/me/saved-jobs`
Retrieves applicant saved jobs with pagination.
- **Auth Required**: Yes (`APPLICANT` role only)
- **Query Parameters**: `page` (default 1), `limit` (default 10, max 50).
- **Responses**:
  - `200 OK`: Array of saved jobs with embedded job, company, and real-time availability badges.

### 3.23 POST `/api/me/saved-jobs`
Saves a job to applicant bookmarks.
- **Auth Required**: Yes (`APPLICANT` role only)
- **Request Body**: `{"jobId": "..."}`
- **Responses**:
  - `201 Created`: Bookmark created.
  - `400 Bad Request`: Job not published or deadline passed.
  - `409 Conflict`: Job already saved.

### 3.24 DELETE `/api/me/saved-jobs/[jobId]`
Removes saved job bookmark.
- **Auth Required**: Yes (`APPLICANT` role only)

### 3.25 GET `/api/me/applications`
Retrieves applicant's submitted job applications with filtering and pagination.
- **Auth Required**: Yes (`APPLICANT` role only)
- **Query Parameters**: `page` (default 1), `limit` (default 10, max 50), `status` (`SUBMITTED` | `UNDER_REVIEW` | `SHORTLISTED` | `REJECTED` | `HIRED` | `WITHDRAWN`), `q` (search title or company).
- **Responses**:
  - `200 OK`: Paginated applications with status, cover letter, resume metadata, profile snapshot summary, and status history timeline.
  - `401 Unauthorized`: Unauthenticated.
  - `403 Forbidden`: User is not an applicant.

### 3.26 GET `/api/me/applications/[id]`
Retrieves full details of a specific submitted job application owned by the applicant.
- **Auth Required**: Yes (`APPLICANT` role only)
- **Path Parameter**: `id` (Application ID)
- **Responses**:
  - `200 OK`: Full application object including job, company, cover letter, preserved resume metadata, profile snapshot, and status history.
  - `401 Unauthorized`: Unauthenticated.
  - `403/404`: Application not found or belongs to another user.

### 3.27 GET `/api/me/applications/[id]/resume`
Streams the immutable preserved resume snapshot associated with the candidate's application.
- **Auth Required**: Yes (`APPLICANT` role only, must be application owner)
- **Path Parameter**: `id` (Application ID)
- **Responses**:
  - `200 OK`: Binary file stream (PDF/DOCX) with `Content-Type`, `Content-Disposition`, and `X-Content-Type-Options: nosniff`.
  - `401 Unauthorized`: Unauthenticated.
  - `403/404`: Application not found or belongs to another user.

### 3.28 POST `/api/me/applications/[id]/withdraw`
Withdraws an active job application (`SUBMITTED`, `UNDER_REVIEW`, or `SHORTLISTED`).
- **Auth Required**: Yes (`APPLICANT` role only, must be application owner)
- **Path Parameter**: `id` (Application ID)
- **Request Body**:
  ```json
  {
    "reason": "Accepted another offer."
  }
  ```
- **Responses**:
  - `200 OK`: `{"success": true, "message": "Application withdrawn successfully."}`
  - `400 Bad Request`: Application status is already `WITHDRAWN`, `REJECTED`, or `HIRED`.
  - `401 Unauthorized`: Unauthenticated.
  - `403/404`: Application not found or belongs to another user.

---

## 4. Job Application Submission Endpoint

### 4.1 POST `/api/jobs/[slug]/apply`
Submits an internal application for a published job.
- **Auth Required**: Yes (`APPLICANT` role only; Recruiters and Admins are strictly forbidden)
- **Path Parameter**: `slug` (Job slug)
- **Request Body**:
  ```json
  {
    "resumeId": "cm...", // Must be a valid ApplicantResume owned by the user
    "coverLetter": "I am excited to apply for this position..."
  }
  ```
- **Business Logic & Validations**:
  - Verifies authenticated user has `APPLICANT` role.
  - Verifies job exists, has status `PUBLISHED`, application method is `INTERNAL`, and deadline is not expired.
  - Verifies selected `resumeId` exists, is owned by the applicant, and source file exists in physical storage.
  - Rejects arbitrary user-supplied `resumeUrl` strings.
  - Enforces duplicate prevention via database `@@unique([jobId, userId])` returning `409 Conflict`.
  - Creates an immutable deep profile snapshot (contact, headline, bio, education, experience, skills).
  - Copies resume file into `private/application-resumes/` guaranteeing permanent immutability.
  - Atomically creates `Application` record, records initial `ApplicationStatusHistory` event (`SUBMITTED`), and increments `Job.applicationCount`.
  - Dispatches non-blocking email notifications to candidate and company recruiters.
- **Responses**:
  - `201 Created`:
    ```json
    {
      "success": true,
      "message": "Application submitted successfully.",
      "data": {
        "id": "cm...",
        "jobId": "...",
        "status": "SUBMITTED",
        "createdAt": "..."
      }
    }
    ```
  - `400 Bad Request`: Missing/invalid resume ID, deadline passed, or job requires external/email application.
  - `401 Unauthorized`: Unauthenticated guest.
  - `403 Forbidden`: User has `RECRUITER` or `ADMIN` role.
  - `404 Not Found`: Job does not exist or is not published.
  - `409 Conflict`: User has already applied for this job.

---

## 5. Recruiter ATS Endpoints

### 5.1 GET `/api/recruiter/jobs/[id]/applications`
Retrieves applicant submissions for a specific job posted by the recruiter's company.
- **Auth Required**: Yes (`RECRUITER` or `ADMIN` role with active company membership)
- **Path Parameter**: `id` (Job ID or slug)
- **Query Parameters**: `page`, `limit`, `status` (`SUBMITTED` | `UNDER_REVIEW` | `SHORTLISTED` | `REJECTED` | `HIRED` | `WITHDRAWN`), `q` (search candidate name or email).
- **Security Check**: Cross-company isolation strictly enforced (job must belong to recruiter's company).
- **Responses**:
  - `200 OK`:
    ```json
    {
      "success": true,
      "data": {
        "job": { "id": "...", "slug": "...", "title": "...", "company": { "id": "...", "name": "..." } },
        "applications": [
          {
            "id": "...",
            "applicantName": "Alice Candidate",
            "applicantEmail": "alice@example.com",
            "status": "SUBMITTED",
            "resumeFileName": "resume.pdf",
            "profileSnapshot": {},
            "statusHistory": [],
            "createdAt": "..."
          }
        ]
      },
      "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
    }
    ```
  - `401 Unauthorized`: Unauthenticated.
  - `403 Forbidden`: Recruiter from another company or user not authorized.
  - `404 Not Found`: Job does not exist.

### 5.2 GET `/api/recruiter/applications/[id]`
Retrieves full candidate review details for a specific application.
- **Auth Required**: Yes (`RECRUITER` or `ADMIN` role with active company membership)
- **Path Parameter**: `id` (Application ID)
- **Security Check**: Enforces that the application's job belongs to recruiter's company.
- **Responses**:
  - `200 OK`: Application detail including complete profile snapshot, resume metadata, and full status transition audit trail.
  - `403 Forbidden`: Application belongs to a job posted by a different company.
  - `404 Not Found`: Application not found.

### 5.3 GET `/api/recruiter/applications/[id]/resume`
Streams the candidate's preserved submitted resume directly to the authorized company recruiter.
- **Auth Required**: Yes (`RECRUITER` or `ADMIN` role with active company membership)
- **Path Parameter**: `id` (Application ID)
- **Security Check**: Cross-company multi-tenant verification (job must belong to recruiter's company).
- **Responses**:
  - `200 OK`: Binary file stream (PDF/DOCX) with security headers.
  - `403 Forbidden`: Recruiter is from a different company organization.
  - `404 Not Found`: Application or resume file not found.

### 5.4 PATCH `/api/recruiter/applications/[id]/status`
Updates candidate application pipeline status with transition validation, audit logging, and candidate notifications.
- **Auth Required**: Yes (`RECRUITER` or `ADMIN` role with active company membership)
- **Path Parameter**: `id` (Application ID)
- **Request Body**:
  ```json
  {
    "status": "UNDER_REVIEW", // Allowed: UNDER_REVIEW | SHORTLISTED | REJECTED | HIRED
    "reason": "Strong backend systems background." // Optional note / feedback
  }
  ```
- **Lifecycle Transition Rules**:
  - `SUBMITTED` -> `UNDER_REVIEW`, `SHORTLISTED`, `REJECTED`
  - `UNDER_REVIEW` -> `SHORTLISTED`, `REJECTED`, `HIRED`
  - `SHORTLISTED` -> `HIRED`, `REJECTED`, `UNDER_REVIEW`
  - `REJECTED` -> `UNDER_REVIEW`, `SHORTLISTED`
  - `HIRED` -> terminal (or re-evaluation)
  - `WITHDRAWN` -> terminal; recruiter cannot transition a candidate-withdrawn application.
- **Responses**:
  - `200 OK`: `{"success": true, "message": "Application status updated successfully.", "data": { ... }}`
  - `400 Bad Request`: Invalid transition or application is in a terminal withdrawn state.
  - `403 Forbidden`: Job belongs to another company.
  - `404 Not Found`: Application not found.
