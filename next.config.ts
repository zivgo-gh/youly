import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.0.0.140", "10.0.0.161", "10.0.0.172"],
  devIndicators: false,

  // Inlined at build time so the running app can state which build it is.
  // VERCEL_GIT_COMMIT_SHA is only available to the BUILD, not the browser, and
  // `env` is the documented way to get such a value into the client bundle.
  //
  // This exists because a stale-asset problem cost most of a day: fixes appeared
  // to do nothing because the browser was serving an older bundle, and there was
  // no way to tell which build was actually live. Now there is — Account > About.
  env: {
    NEXT_PUBLIC_BUILD_SHA: process.env.VERCEL_GIT_COMMIT_SHA ?? "",
    NEXT_PUBLIC_BUILD_ENV: process.env.VERCEL_ENV ?? "development",
    NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
  },

  // The app used to live at the top level. Prod data is a handful of testers, but
  // these are cheap and keep any bookmark, home-screen shortcut, or OAuth-era link
  // working. /intro is gone entirely — the marketing homepage replaced it.
  async redirects() {
    return [
      { source: "/chat", destination: "/app/chat", permanent: true },
      { source: "/progress", destination: "/app/progress", permanent: true },
      { source: "/meals", destination: "/app/meals", permanent: true },
      { source: "/onboarding", destination: "/app/onboarding", permanent: true },
      { source: "/consent", destination: "/app/consent", permanent: true },
      { source: "/start", destination: "/app", permanent: true },
      { source: "/intro", destination: "/", permanent: true },
    ];
  },
};

export default nextConfig;
