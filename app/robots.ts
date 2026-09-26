import type { MetadataRoute } from "next";

// Kept pure on purpose: robots.ts is a Route Handler that Next caches by
// default, and a single request-time API call (cookies/headers) would make it
// dynamic. Nothing here touches the request.
//
// The disallow list covers both the pre-move paths (/chat, /meals, …) and the
// post-move prefix (/app/), so it stays correct throughout the migration.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/app/",
        "/chat",
        "/progress",
        "/meals",
        "/onboarding",
        "/consent",
        "/start",
        "/login",
        "/api/",
        "/auth/",
      ],
    },
    sitemap: "https://www.youly.app/sitemap.xml",
    host: "https://www.youly.app",
  };
}
