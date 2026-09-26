import { SiteHeader, SiteFooter } from "@/components/site/SiteChrome";

/**
 * Public marketing chrome.
 *
 * Hard rule for everything under (site): never call cookies(), headers(), or read
 * searchParams. Any one of those turns the route dynamic, and these pages exist to
 * be statically prerendered and crawled.
 */
export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
