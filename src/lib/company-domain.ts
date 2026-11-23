const COMMON_PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "ymail.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "zoho.com",
  "proton.me",
  "protonmail.com",
  "mail.com",
  "gmx.com",
]);

/**
 * Normalizes a company website or corporate email domain into a clean host string.
 * Example: "https://www.Acme.co.uk/about?ref=1" -> "acme.co.uk"
 * Example: "recruiting@stripe.com" -> "stripe.com"
 * Returns null if domain cannot be resolved or is a generic public webmail provider.
 */
export function normalizeCompanyDomain(
  website?: string | null,
  officialEmail?: string | null
): string | null {
  if (website && typeof website === "string" && website.trim().length > 0) {
    try {
      let raw = website.trim().toLowerCase();
      if (!raw.startsWith("http://") && !raw.startsWith("https://")) {
        raw = `https://${raw}`;
      }
      const url = new URL(raw);
      let host = url.hostname.toLowerCase();
      if (host.startsWith("www.")) {
        host = host.slice(4);
      }
      if (host && !COMMON_PUBLIC_EMAIL_DOMAINS.has(host) && host.includes(".")) {
        return host;
      }
    } catch {
      // Fallback manual regex parser if URL parsing fails
      const cleaned = website
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, "")
        .replace(/^www\./, "")
        .split("/")[0]
        .split("?")[0]
        .split(":")[0];
      if (cleaned && !COMMON_PUBLIC_EMAIL_DOMAINS.has(cleaned) && cleaned.includes(".")) {
        return cleaned;
      }
    }
  }

  if (officialEmail && typeof officialEmail === "string" && officialEmail.includes("@")) {
    const parts = officialEmail.trim().toLowerCase().split("@");
    const domain = parts[parts.length - 1]?.trim();
    if (domain && !COMMON_PUBLIC_EMAIL_DOMAINS.has(domain) && domain.includes(".")) {
      return domain;
    }
  }

  return null;
}
