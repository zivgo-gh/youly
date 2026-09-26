import type { MetadataRoute } from "next";

// Served at /manifest.webmanifest (not /manifest.json).
// start_url is "/app" so anyone who installs Youly lands in the product, while
// "/" stays the marketing front door for everyone arriving from search.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Youly — Your AI weight loss coach",
    short_name: "Youly",
    description:
      "A conversational AI coach that tracks your calories and protein and adapts to how you work.",
    start_url: "/app",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#047857",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
