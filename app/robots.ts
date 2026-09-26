import type { MetadataRoute } from "next";

// Kept pure on purpose: robots.ts is a Route Handler that Next caches by
// default, and a single request-time API call (cookies/headers) would make it
// dynamic. Nothing here touches the request.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // One prefix covers the entire gated tree, so this list can't drift out of
      // sync the way an enumeration of page paths would.
      disallow: ["/app/", "/login", "/api/", "/auth/"],
    },
    sitemap: "https://www.youly.app/sitemap.xml",
    host: "https://www.youly.app",
  };
}
