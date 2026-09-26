import type { Metadata } from "next";
import { MigrationRunner } from "@/components/app/MigrationRunner";

// Belt and braces with robots.ts: a Disallow is a crawl hint, noindex is the
// actual instruction. Nothing under /app should ever be indexed.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <MigrationRunner />
      {children}
    </>
  );
}
