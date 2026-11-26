import type { MetadataRoute } from "next";
import { registrationOpen } from "@/lib/config";

/**
 * Invite-only pilot: nothing is indexed. With open registration (REGISTRATION_MODE=open) only the
 * landing, sign-up, login and help pages may be indexed. Event pages and passes stay unlisted
 * (FR-M28-05) and no sitemap is published.
 */
export default function robots(): MetadataRoute.Robots {
  if (!registrationOpen()) return { rules: [{ userAgent: "*", disallow: "/" }] };
  return { rules: [{ userAgent: "*", allow: ["/$", "/daftar", "/masuk", "/bantuan"], disallow: "/" }] };
}
