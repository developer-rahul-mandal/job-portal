# Job Portal — Security & Code Quality Audit

## 1. Executive Summary
This security audit was conducted against the local workspace at `D:\job-portal`. Every finding is substantiated by concrete source code evidence. No hypothetical vulnerabilities are reported as confirmed defects.

---

## 2. Audit Findings Summary Matrix

| ID | Title | Severity | Area | Status |
| :--- | :--- | :--- | :--- | :--- |
| **SEC-01** | Disconnect in Secure Resume Storage and Recruiter Application Access | **High** | Resumes / Applications | **Resolved in Phase 4** (Immutable Application Snapshot & Isolated Streaming) |
| **SEC-02** | Automatic Google OAuth Account Linking to Existing High-Privilege Roles | **Medium** | Authentication | Confirmed Policy Gap |
| **SEC-03** | Absence of Edge Routing Middleware (`proxy.ts`) | **Medium** | Authorization / Routing | **Resolved in Phase 1** (`src/proxy.ts` + layouts) |
| **SEC-04** | Client IP Spoofing Risk in OTP Rate Limiting via `x-forwarded-for` | **Medium** | Rate Limiting | Operational Risk |
| **SEC-05** | Credential & Environment Variable Exposure in Seed Scripts | **Low** | Operational Security | Confirmed Defect |
| **SEC-06** | Configuration Desynchronization (`MAX_RESUME_SIZE_MB` ignored) | **Low** | Configuration | Confirmed Defect |
| **SEC-07** | Session Check Endpoint Duplication (`/api/auth/me` vs `/api/me`) | **Low** | API Consistency | Confirmed Technical Debt |
| **SEC-08** | Insecure Profile Picture Storage via Unchecked External URLs | **Medium** | Assets / Profile | Confirmed Defect |
| **SEC-09** | Metric Inflation Risk in Unauthenticated External Apply Tracking | **Low** | Public Discovery | Operational Risk |
| **SEC-10** | Unverified Company Job Auto-Publish Bypass | **Medium** | Recruiter / Jobs | **Resolved in Phase 4 Preflight** (`PENDING_REVIEW` enforced) |
| **SEC-11** | Recruiter Role Downgrade on Multi-Company Membership Removal | **Low** | Recruiter / Team | **Resolved in Phase 4 Preflight** (Remaining memberships checked) |

---

## 3. Detailed Confirmed Findings

### SEC-01: Disconnect in Secure Resume Storage and Recruiter Application Access
- **Severity**: **High**
- **Affected Files**:
  - `src/app/api/jobs/[slug]/apply/route.ts` (Lines 77–116, 204)
  - `src/app/api/recruiter/jobs/[slug]/applications/route.ts` (Lines 141)
  - `src/app/api/me/resumes/[id]/download/route.ts` (Lines 46–48, 57–60)
- **Evidence**:
  ```ts
  // src/app/api/jobs/[slug]/apply/route.ts
  if (!("resumeUrl" in body) || typeof body.resumeUrl !== "string") {
    return NextResponse.json({ success: false, message: "A valid resume URL is required." }, { status: 400 });
  }
  // Application is created with resumeUrl:
  await tx.application.create({
    data: { jobId: job.id, userId: session.user.id, applicantName, applicantEmail: session.user.email, resumeUrl, coverLetter }
  });
  ```
  ```ts
  // src/app/api/me/resumes/[id]/download/route.ts
  if (user.role !== "APPLICANT") {
    return errorResponse("Forbidden", 403);
  }
  const resume = await prisma.applicantResume.findFirst({
    where: { id, userId: user.id }, // Only the owner applicant can download
  });
  ```
- **Vulnerability & Impact**:
  1. The platform provides an isolated, magic-byte validated file upload system (`/api/me/resumes`) storing resumes on disk (`./private/resumes`).
  2. However, the job application submission endpoint (`/api/jobs/[slug]/apply`) **only** accepts an external `resumeUrl` string (HTTP/HTTPS) and does not take a `resumeId`.
  3. Furthermore, the resume download endpoint strictly forbids anyone other than the applicant owner (`where: { userId: user.id }`). Recruiters reviewing applicants have no authorized endpoint to download or stream an applicant's uploaded private resume file.
- **Remediation & Resolution**:
  - **Resolved in Phase 4**:
    1. Updated `POST /api/jobs/[slug]/apply` to require a verified `resumeId` owned by the applicant (strictly rejecting user-supplied arbitrary URLs).
    2. Implemented physical snapshot replication into `private/application-resumes/` to guarantee permanent resume immutability even if the applicant later alters or deletes their profile resume.
    3. Created authorized recruiter streaming endpoint `GET /api/recruiter/applications/[id]/resume` with multi-tenant company isolation.
    4. Created applicant streaming endpoint `GET /api/me/applications/[id]/resume`.

---

### SEC-02: Automatic Google OAuth Account Linking to Existing High-Privilege Roles
- **Severity**: **Medium**
- **Affected File**: `src/app/api/auth/google/callback/route.ts` (Lines 118–168)
- **Evidence**:
  ```ts
  const existingUser = await tx.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    if (!existingUser.isActive) {
      throw new Error("USER_INACTIVE");
    }
    // Automatically links Google provider to existingUser without checking role or requiring confirmation
    await tx.authAccount.create({
      data: {
        userId: existingUser.id,
        provider: "GOOGLE",
        providerAccountId: googleId,
      },
    });
  }
  ```
- **Vulnerability & Impact**:
  If a user with a high-privilege role (`RECRUITER` or `ADMIN`) originally signed up via Email OTP, anyone authenticating via Google with that same email will instantly gain full session access to the high-privilege account without an explicit re-authentication, MFA, or linking confirmation step.
- **Remediation**:
  Document and enforce an account linking security policy:
  - If `existingUser.role !== 'APPLICANT'`, require the user to explicitly log in first with Email OTP and initiate Google account linking from an authenticated settings page.
  - Or restrict automatic linking to `APPLICANT` roles only.

---

### SEC-03: Absence of Edge Routing Middleware (`middleware.ts`)
- **Severity**: **Medium**
- **Affected Area**: Next.js App Router root / `src/middleware.ts` (Missing)
- **Evidence**: `Test-Path src/middleware.ts` returns `False`.
- **Vulnerability & Impact**:
  Protected client dashboard routes (`/dashboard`, `/recruiter/*`, `/admin/*`) are not protected at the edge/routing layer. Unauthenticated visitors can load protected pages, causing UI flashes, unnecessary client bundle execution, or reliance solely on client-side `useEffect` redirect checks.
- **Remediation**:
  Implement `src/middleware.ts` matching protected routes (`/dashboard/:path*`, `/recruiter/:path*`, `/admin/:path*`), verifying the presence of the `session` cookie and redirecting unauthenticated requests to `/login?redirect=...`.

---

### SEC-04: Client IP Spoofing Risk in OTP Rate Limiting via `x-forwarded-for`
- **Severity**: **Medium**
- **Affected Files**:
  - `src/app/api/auth/register/send-otp/route.ts` (Lines 28–37)
  - `src/app/api/auth/login/send-otp/route.ts` (Lines 28–37)
- **Evidence**:
  ```ts
  function getClientIp(request: NextRequest): string {
    const forwardedFor = request.headers.get("x-forwarded-for");
    if (forwardedFor) {
      return forwardedFor.split(",")[0].trim();
    }
    return request.headers.get("x-real-ip") || "unknown";
  }
  ```
- **Vulnerability & Impact**:
  If deployed behind a reverse proxy that does not strip or overwrite incoming `X-Forwarded-For` headers from untrusted clients, an attacker can supply a spoofed `X-Forwarded-For` IP address on every request, effectively defeating the IP rate-limiting rule (5 hits per 15 minutes).
- **Remediation**:
  1. Rely primarily on `request.ip` if provided by the hosting platform (e.g., Vercel / Cloudflare).
  2. When using `x-forwarded-for` behind custom proxies, document the proxy requirement to strip untrusted incoming headers and append the true remote address.

---

### SEC-05: Database Credential & Configuration Exposure in Seed Scripts
- **Severity**: **Low**
- **Affected File**: `prisma/seed-jobs.ts` (Lines 6–12)
- **Evidence**:
  ```ts
  console.log({
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_USER: process.env.DB_USER,
    DB_NAME: process.env.DB_NAME,
    DB_PASSWORD_LOADED: process.env.DB_PASSWORD !== undefined,
  });
  ```
- **Vulnerability & Impact**:
  Database connection parameters and structure are output to standard log streams when running maintenance seed scripts.
- **Remediation**:
  Remove diagnostic logging from database seed files.

---

### SEC-06: Configuration Desynchronization (`MAX_RESUME_SIZE_MB` ignored)
- **Severity**: **Low**
- **Affected File**: `src/app/api/me/resumes/route.ts` (Line 17)
- **Evidence**:
  ```ts
  // .env defines MAX_RESUME_SIZE_MB=5
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // Hardcoded in source
  ```
- **Vulnerability & Impact**:
  System administrators adjusting `MAX_RESUME_SIZE_MB` in the environment configuration will find their change has no effect on upload validation limits.
- **Remediation**:
  Parse `Number(process.env.MAX_RESUME_SIZE_MB ?? 5) * 1024 * 1024` dynamically.

---

### SEC-07: Session Check Endpoint Duplication (`/api/auth/me` vs `/api/me`)
- **Severity**: **Low**
- **Affected Files**:
  - `src/app/api/auth/me/route.ts`
  - `src/app/api/me/route.ts`
- **Evidence**:
  Two separate routes provide current user identity data with differing data envelopes and redundant database queries.
- **Remediation**:
  Standardize on `/api/auth/me` for authentication status and `/api/me/profile` for profile data. Deprecate redundant handler.

---

### SEC-08: Insecure Profile Picture Storage via Unchecked External URLs
- **Severity**: **Medium**
- **Affected File**: `src/app/api/me/profile/route.ts` (Lines 248–275)
- **Evidence**:
  ```ts
  // src/app/api/me/profile/route.ts
  if ("profileImage" in input) {
    // Only validates protocol is http: or https:
    const parsedUrl = new URL(input.profileImage);
    data.profileImage = input.profileImage.trim();
  }
  ```
- **Vulnerability & Impact**:
  1. Profile images are treated solely as external web URLs rather than uploaded, verified files.
  2. Users can supply URLs pointing to untrusted external domains, leading to mixed-content warnings, broken image links, or tracking beacons.
  3. Lack of binary magic-byte verification means users could reference malicious SVG files containing JavaScript payloads (`<script>` in SVG), causing Stored XSS if rendered unsafely.
- **Remediation**:
  1. Replace external URL strings with local uploaded file storage under `private/profile-pictures/`.
  2. Enforce binary magic-byte inspection for JPEG, PNG, and WebP, explicitly rejecting SVG.
  3. Serve profile pictures via an authenticated streaming endpoint with Content-Disposition and anti-sniffing headers.

---

### SEC-09: Metric Inflation Risk in Unauthenticated External Apply Tracking
- **Severity**: **Low**
- **Affected Route**: Planned `POST /api/jobs/[slug]/click`
- **Vulnerability & Impact**:
  Because external job applications do not require user authentication, automated web scrapers or malicious bots could repeatedly ping the click-tracking endpoint to artificially inflate `Job.applyClickCount`.
- **Remediation**:
  Apply IP-based rate limiting or Redis-backed windowed debounce on external apply clicks to prevent rapid successive increments for the same job and client IP.
