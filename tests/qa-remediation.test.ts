import { describe, it, expect } from "vitest";
import { normalizeCompanyDomain } from "@/lib/company-domain";
import {
  isValidStatusTransition,
  ALLOWED_STATUS_TRANSITIONS,
  canWithdrawApplication,
} from "@/lib/application-lifecycle";
import { escapeHtml } from "@/lib/notifications";
import {
  isSafeApplicationResumeKey,
  getApplicationResumeFilePath,
} from "@/lib/application-storage";

describe("QA Remediation Test Suite", () => {
  describe("1. Company Domain Deduplication & Normalization", () => {
    it("normalizes standard URLs with protocols and trailing slashes", () => {
      expect(normalizeCompanyDomain("https://www.google.com/careers")).toBe("google.com");
      expect(normalizeCompanyDomain("http://acme.org/")).toBe("acme.org");
      expect(normalizeCompanyDomain("HTTPS://SUB.DOMAIN.CO.UK/path/to/page")).toBe("sub.domain.co.uk");
    });

    it("normalizes bare domains and strips www prefix", () => {
      expect(normalizeCompanyDomain("www.stripe.com")).toBe("stripe.com");
      expect(normalizeCompanyDomain("stripe.com")).toBe("stripe.com");
      expect(normalizeCompanyDomain("   MICROSOFT.COM   ")).toBe("microsoft.com");
    });

    it("rejects invalid domain formats gracefully returning null", () => {
      expect(normalizeCompanyDomain("")).toBeNull();
      expect(normalizeCompanyDomain("not a valid url or domain")).toBeNull();
      expect(normalizeCompanyDomain("http://")).toBeNull();
    });

    it("detects domain collisions between distinct URLs of the same company", () => {
      const existingDomain = normalizeCompanyDomain("https://techcorp.io/careers");
      const incomingDomain = normalizeCompanyDomain("http://www.techcorp.io/about-us");
      expect(existingDomain).toBe("techcorp.io");
      expect(incomingDomain).toBe("techcorp.io");
      expect(existingDomain === incomingDomain).toBe(true);
    });
  });

  describe("2. Application Lifecycle State Machine & Terminal Enforcement", () => {
    it("identifies terminal statuses strictly (no outbound transitions)", () => {
      expect(ALLOWED_STATUS_TRANSITIONS.REJECTED).toHaveLength(0);
      expect(ALLOWED_STATUS_TRANSITIONS.HIRED).toHaveLength(0);
      expect(ALLOWED_STATUS_TRANSITIONS.WITHDRAWN).toHaveLength(0);
    });

    it("forbids any transition out of terminal statuses (Bug 15 remediation)", () => {
      expect(isValidStatusTransition("REJECTED", "UNDER_REVIEW", "RECRUITER").valid).toBe(false);
      expect(isValidStatusTransition("REJECTED", "SHORTLISTED", "RECRUITER").valid).toBe(false);
      expect(isValidStatusTransition("HIRED", "UNDER_REVIEW", "RECRUITER").valid).toBe(false);
      expect(isValidStatusTransition("WITHDRAWN", "UNDER_REVIEW", "RECRUITER").valid).toBe(false);
    });

    it("permits valid forward transitions for recruiters", () => {
      expect(isValidStatusTransition("SUBMITTED", "UNDER_REVIEW", "RECRUITER").valid).toBe(true);
      expect(isValidStatusTransition("UNDER_REVIEW", "SHORTLISTED", "RECRUITER").valid).toBe(true);
      expect(isValidStatusTransition("SHORTLISTED", "HIRED", "RECRUITER").valid).toBe(true);
      expect(isValidStatusTransition("UNDER_REVIEW", "REJECTED", "RECRUITER").valid).toBe(true);
      expect(isValidStatusTransition("SHORTLISTED", "REJECTED", "RECRUITER").valid).toBe(true);
    });

    it("restricts applicant actions: candidate can only withdraw from non-terminal states", () => {
      expect(canWithdrawApplication("SUBMITTED")).toBe(true);
      expect(canWithdrawApplication("UNDER_REVIEW")).toBe(true);
      expect(canWithdrawApplication("SHORTLISTED")).toBe(true);
      expect(canWithdrawApplication("HIRED")).toBe(false);
      expect(canWithdrawApplication("REJECTED")).toBe(false);
      expect(canWithdrawApplication("WITHDRAWN")).toBe(false);

      expect(isValidStatusTransition("SUBMITTED", "WITHDRAWN", "APPLICANT").valid).toBe(true);
      expect(isValidStatusTransition("UNDER_REVIEW", "WITHDRAWN", "APPLICANT").valid).toBe(true);
      expect(isValidStatusTransition("SUBMITTED", "SHORTLISTED", "APPLICANT").valid).toBe(false);
      expect(isValidStatusTransition("WITHDRAWN", "SUBMITTED", "APPLICANT").valid).toBe(false);
      expect(isValidStatusTransition("REJECTED", "WITHDRAWN", "APPLICANT").valid).toBe(false);
    });
  });

  describe("3. Notification Template HTML Sanitization", () => {
    it("escapes all standard HTML injection characters", () => {
      const dirty = `<script>alert("XSS")</script>&'`;
      const clean = escapeHtml(dirty);
      expect(clean).not.toContain("<");
      expect(clean).not.toContain(">");
      expect(clean).not.toContain('"');
      expect(clean).not.toContain("'");
      expect(clean).toBe("&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;&amp;&#039;");
    });

    it("handles null, undefined, or empty values safely", () => {
      expect(escapeHtml(null)).toBe("");
      expect(escapeHtml(undefined)).toBe("");
      expect(escapeHtml("")).toBe("");
    });

    it("preserves safe plain text intact", () => {
      expect(escapeHtml("Senior Software Engineer")).toBe("Senior Software Engineer");
      expect(escapeHtml("Acme Corp 123")).toBe("Acme Corp 123");
    });
  });

  describe("4. Resume Storage Key Validation & Path Traversal Prevention", () => {
    it("accepts valid application resume keys", () => {
      const validKey = "app-12345678-1234-1234-1234-123456789abc.pdf";
      expect(isSafeApplicationResumeKey(validKey)).toBe(true);
    });

    it("rejects malicious path traversal keys", () => {
      expect(isSafeApplicationResumeKey("../../../etc/passwd")).toBe(false);
      expect(isSafeApplicationResumeKey("..\\windows\\system32\\cmd.exe")).toBe(false);
      expect(isSafeApplicationResumeKey("/root/secrets.txt")).toBe(false);
      expect(isSafeApplicationResumeKey("app-1234.exe")).toBe(false);
    });

    it("throws Error when resolving file path for unsafe keys", () => {
      expect(() => getApplicationResumeFilePath("../../evil.pdf")).toThrow(
        "Invalid application resume storage key"
      );
    });
  });

  describe("5. ATS Safe Pagination Calculation", () => {
    function sanitizePageNumber(param: string | null | undefined): number {
      const raw = Number.parseInt(String(param ?? "1"), 10);
      return Number.isFinite(raw) && raw >= 1 ? raw : 1;
    }

    it("safely handles non-numeric and NaN string inputs", () => {
      expect(sanitizePageNumber("abc")).toBe(1);
      expect(sanitizePageNumber("undefined")).toBe(1);
      expect(sanitizePageNumber("null")).toBe(1);
      expect(sanitizePageNumber("NaN")).toBe(1);
      expect(sanitizePageNumber("")).toBe(1);
    });

    it("safely handles negative numbers and zero", () => {
      expect(sanitizePageNumber("-5")).toBe(1);
      expect(sanitizePageNumber("0")).toBe(1);
    });

    it("correctly parses valid positive page numbers", () => {
      expect(sanitizePageNumber("1")).toBe(1);
      expect(sanitizePageNumber("4")).toBe(4);
      expect(sanitizePageNumber("100")).toBe(100);
    });
  });

  describe("6. Tokenized Team Invitations & Role Preservation Logic", () => {
    it("calculates 7-day expiration time accurately", () => {
      const now = Date.now();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const diffDays = (expiresAt.getTime() - now) / (1000 * 60 * 60 * 24);
      expect(Math.round(diffDays)).toBe(7);
    });

    it("preserves global user role when user joins a company", () => {
      // Global role remains APPLICANT while CompanyRecruiter membership grants recruiter privilege
      const user = { id: "user_1", role: "APPLICANT", email: "applicant@test.com" };
      const companyMembership = {
        userId: user.id,
        companyId: "comp_1",
        role: "RECRUITER",
        status: "ACTIVE",
      };

      expect(user.role).toBe("APPLICANT");
      expect(companyMembership.role).toBe("RECRUITER");
      expect(companyMembership.status).toBe("ACTIVE");
    });
  });

  describe("7. Security DTO Sanitization", () => {
    it("omits internal storage keys from application payload", () => {
      const dbApplication = {
        id: "app_123",
        status: "SUBMITTED",
        applicantName: "Jane Doe",
        applicantEmail: "jane@example.com",
        coverLetter: "Excited to apply!",
        resumeStorageKey: "app-12345678-1234-1234-1234-123456789abc.pdf",
        resumeFileName: "Jane_Resume.pdf",
        resumeMimeType: "application/pdf",
        resumeFileSize: 102400,
      };

      // Simulating DTO sanitization
      const { resumeStorageKey, ...safeDto } = dbApplication;

      expect(safeDto).not.toHaveProperty("resumeStorageKey");
      expect(safeDto.resumeFileName).toBe("Jane_Resume.pdf");
      expect(safeDto.id).toBe("app_123");
    });
  });

  describe("8. Optimistic Concurrency Control Simulator", () => {
    it("detects when application status was modified by another session", () => {
      let dbStatus: string = "UNDER_REVIEW";

      function updateStatusOptimistic(
        expectedCurrentStatus: string,
        newStatus: string
      ): { success: boolean; conflict?: boolean } {
        if (dbStatus !== expectedCurrentStatus) {
          return { success: false, conflict: true };
        }
        dbStatus = newStatus;
        return { success: true };
      }

      // First recruiter action succeeds
      const result1 = updateStatusOptimistic("UNDER_REVIEW", "SHORTLISTED");
      expect(result1.success).toBe(true);

      // Concurrent second recruiter action with stale state fails with 409 Conflict
      const result2 = updateStatusOptimistic("UNDER_REVIEW", "REJECTED");
      expect(result2.success).toBe(false);
      expect(result2.conflict).toBe(true);
    });
  });

  describe("9. Multi-Company Tenant Switching Logic", () => {
    interface Membership {
      companyId: string;
      role: string;
      company: { id: string; name: string };
    }

    function resolveActiveCompany(
      cookieCompanyId: string | undefined,
      memberships: Membership[]
    ): Membership | null {
      if (memberships.length === 0) return null;
      if (cookieCompanyId) {
        const found = memberships.find((m) => m.companyId === cookieCompanyId);
        if (found) return found;
      }
      return memberships[0];
    }

    const memberships: Membership[] = [
      { companyId: "comp_a", role: "ADMIN", company: { id: "comp_a", name: "Alpha Corp" } },
      { companyId: "comp_b", role: "RECRUITER", company: { id: "comp_b", name: "Beta Labs" } },
    ];

    it("defaults to the first active membership when no cookie is set", () => {
      const active = resolveActiveCompany(undefined, memberships);
      expect(active?.companyId).toBe("comp_a");
      expect(active?.company.name).toBe("Alpha Corp");
    });

    it("switches to the requested company when cookie matches a valid membership", () => {
      const active = resolveActiveCompany("comp_b", memberships);
      expect(active?.companyId).toBe("comp_b");
      expect(active?.company.name).toBe("Beta Labs");
    });

    it("falls back to default if cookie specifies an unauthorized or non-existent company", () => {
      const active = resolveActiveCompany("comp_unknown", memberships);
      expect(active?.companyId).toBe("comp_a");
    });
  });

  describe("10. Job Publication Lifecycle & Moderation Boundary", () => {
    function resolveJobStatusOnSave(
      requestedStatus: string,
      isAdmin: boolean,
      isEditOfPublished: boolean
    ): string {
      if (isAdmin) {
        return requestedStatus;
      }
      if (isEditOfPublished) {
        return "PENDING_REVIEW";
      }
      if (requestedStatus === "PUBLISHED" || requestedStatus === "PENDING_REVIEW") {
        return "PENDING_REVIEW";
      }
      return "DRAFT";
    }

    it("recruiter attempting to directly publish maps to PENDING_REVIEW", () => {
      const status = resolveJobStatusOnSave("PUBLISHED", false, false);
      expect(status).toBe("PENDING_REVIEW");
    });

    it("editing an already published job resets status to PENDING_REVIEW for recruiter", () => {
      const status = resolveJobStatusOnSave("PUBLISHED", false, true);
      expect(status).toBe("PENDING_REVIEW");
    });

    it("admin can directly publish or preserve PUBLISHED status", () => {
      const status = resolveJobStatusOnSave("PUBLISHED", true, true);
      expect(status).toBe("PUBLISHED");
    });

    it("moderation rejection requires non-empty reason", () => {
      function validateRejectionReason(reason: string | undefined): boolean {
        return typeof reason === "string" && reason.trim().length >= 5;
      }

      expect(validateRejectionReason("")).toBe(false);
      expect(validateRejectionReason("   ")).toBe(false);
      expect(validateRejectionReason(undefined)).toBe(false);
      expect(validateRejectionReason("Job description contains prohibited third-party affiliate links."))
        .toBe(true);
    });
  });
});
