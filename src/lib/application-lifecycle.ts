import { ApplicationStatus } from "@/generated/prisma/client";

export const ALLOWED_STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  SUBMITTED: ["UNDER_REVIEW", "SHORTLISTED", "REJECTED", "WITHDRAWN"],
  UNDER_REVIEW: ["SHORTLISTED", "REJECTED", "WITHDRAWN"],
  SHORTLISTED: ["HIRED", "REJECTED", "WITHDRAWN"],
  REJECTED: [], // Terminal status
  HIRED: [],    // Terminal status
  WITHDRAWN: [],// Terminal status
};

export const RECRUITER_PERMITTED_STATUSES: ApplicationStatus[] = [
  "UNDER_REVIEW",
  "SHORTLISTED",
  "REJECTED",
  "HIRED",
];

export const APPLICANT_PERMITTED_STATUSES: ApplicationStatus[] = [
  "WITHDRAWN",
];

export function canWithdrawApplication(status: ApplicationStatus): boolean {
  return status === "SUBMITTED" || status === "UNDER_REVIEW" || status === "SHORTLISTED";
}

export function isValidStatusTransition(
  currentStatus: ApplicationStatus,
  nextStatus: ApplicationStatus,
  actorRole: "RECRUITER" | "APPLICANT" | "ADMIN"
): { valid: boolean; error?: string } {
  if (currentStatus === nextStatus) {
    return { valid: false, error: `Application is already in status "${currentStatus}".` };
  }

  // Check role restrictions
  if (actorRole === "RECRUITER") {
    if (nextStatus === "WITHDRAWN") {
      return {
        valid: false,
        error: "Recruiters cannot withdraw applications on behalf of candidates. Only the candidate can withdraw their application.",
      };
    }
    if (!RECRUITER_PERMITTED_STATUSES.includes(nextStatus)) {
      return {
        valid: false,
        error: `Recruiters are not permitted to set status to "${nextStatus}".`,
      };
    }
  } else if (actorRole === "APPLICANT") {
    if (nextStatus !== "WITHDRAWN") {
      return {
        valid: false,
        error: `Applicants are only permitted to withdraw their application.`,
      };
    }
    if (!canWithdrawApplication(currentStatus)) {
      return {
        valid: false,
        error: `Cannot withdraw an application that is already "${currentStatus}".`,
      };
    }
  }

  // Admins can perform any transition except invalid graph edges unless overriding
  const allowedNext = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
  if (actorRole !== "ADMIN" && !allowedNext.includes(nextStatus)) {
    return {
      valid: false,
      error: `Invalid status transition from "${currentStatus}" to "${nextStatus}". Allowed transitions: ${
        allowedNext.length > 0 ? allowedNext.join(", ") : "None (terminal status)"
      }.`,
    };
  }

  return { valid: true };
}
