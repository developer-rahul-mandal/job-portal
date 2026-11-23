export type UserRole = "APPLICANT" | "RECRUITER" | "ADMIN";

/**
 * Returns the default dashboard destination path for a given user role.
 */
export function getDefaultDashboardPath(role: UserRole): string {
  switch (role) {
    case "RECRUITER":
      return "/recruiter/dashboard";
    case "ADMIN":
      return "/admin";
    case "APPLICANT":
    default:
      return "/dashboard";
  }
}

/**
 * Checks whether a given path is authorized for the given role.
 */
export function isPathAllowedForRole(path: string, role: UserRole): boolean {
  const normalized = path.toLowerCase();

  // Admin has access to all internal sections
  if (role === "ADMIN") {
    return true;
  }

  // Applicants cannot access recruiter or admin workspaces
  if (role === "APPLICANT") {
    if (
      normalized === "/recruiter" ||
      normalized.startsWith("/recruiter/") ||
      normalized === "/admin" ||
      normalized.startsWith("/admin/")
    ) {
      return false;
    }
    return true;
  }

  // Recruiters cannot access admin workspace
  if (role === "RECRUITER") {
    if (normalized === "/admin" || normalized.startsWith("/admin/")) {
      return false;
    }
    return true;
  }

  return false;
}

/**
 * Validates and sanitizes an incoming redirect path parameter against
 * open-redirect attacks and role-based access restrictions.
 */
export function sanitizeRedirectPath(
  redirectParam: string | null | undefined,
  role: UserRole,
): string {
  const defaultPath = getDefaultDashboardPath(role);

  if (!redirectParam || typeof redirectParam !== "string") {
    return defaultPath;
  }

  const trimmed = redirectParam.trim();

  // Must begin with a single "/" and not "//" (protocol-relative) or backslash
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\")
  ) {
    return defaultPath;
  }

  // Prevent control characters, line breaks, or URL schemes (e.g. javascript:)
  if (/[\r\n\t]/.test(trimmed) || /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(trimmed)) {
    return defaultPath;
  }

  // Extract path without query parameters or hash fragments
  const pathOnly = trimmed.split("?")[0].split("#")[0];

  // Prevent redirect loops to login or registration pages
  if (
    pathOnly === "/login" ||
    pathOnly === "/register" ||
    pathOnly.startsWith("/api/")
  ) {
    return defaultPath;
  }

  // Ensure user's role is permitted to visit this destination
  if (!isPathAllowedForRole(pathOnly, role)) {
    return defaultPath;
  }

  return trimmed;
}
