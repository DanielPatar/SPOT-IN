import type { MetadataRoute } from "next";

/** Invite-only pilot: nothing is indexed; event pages and passes are unlisted (FR-M28-05). No sitemap is published. */
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", disallow: "/" }] };
}
