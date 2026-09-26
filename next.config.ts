import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["10.0.0.140", "10.0.0.161", "10.0.0.172"],
  devIndicators: false,

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
