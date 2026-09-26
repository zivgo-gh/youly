import type { Metadata, Viewport } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";

// One typeface for the whole product. Geist and Geist_Mono used to be imported
// here too and were never painted by anything — pure download weight on a
// mobile-first site, so they're gone.
const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const SITE_URL = "https://www.youly.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Youly — Your AI weight loss coach",
    template: "%s · Youly",
  },
  description:
    "Log food by talking. Youly is a conversational AI coach that tracks your calories and protein, adapts to how you work, and turns your goal into week-by-week milestones.",
  applicationName: "Youly",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: "Youly",
    url: "/",
    locale: "en_US",
    title: "Youly — Your AI weight loss coach",
    description:
      "Log food by talking. A conversational AI coach that tracks calories and protein and adapts to you.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Youly — Your AI weight loss coach",
    description:
      "Log food by talking. A conversational AI coach that tracks calories and protein and adapts to you.",
  },
  robots: { index: true, follow: true },
  appleWebApp: { capable: true, title: "Youly", statusBarStyle: "default" },
};

// In Next 16 `viewport` and `themeColor` are a separate export, not metadata
// fields. `resizes-content` is what keeps the chat composer above the iOS
// keyboard instead of being overlaid by it.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  interactiveWidget: "resizes-content",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0b4a55" },
    { media: "(prefers-color-scheme: dark)", color: "#052026" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} h-full`}>
      <body className="min-h-full flex flex-col font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
