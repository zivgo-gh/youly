import { AppSidebar, AppTabBar } from "./AppNav";
import { Wordmark } from "@/components/brand/Wordmark";
import { AccountMenuTrigger } from "@/components/app/AccountMenu";

/**
 * The gated app's frame: sidebar from lg up, mobile header plus bottom tab bar
 * below it.
 *
 * Uses h-dvh rather than h-screen. h-screen is 100vh, which on iOS Safari sits
 * partly behind the address bar — exactly the bug the pinned chat composer had.
 */
export function AppShell({
  children,
  sidebarFooter,
}: {
  children: React.ReactNode;
  sidebarFooter?: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh overflow-hidden bg-surface-sunken">
      <AppSidebar footer={sidebarFooter} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile header. The sidebar carries the wordmark and account on lg+, so
            this is hidden there rather than duplicated. */}
        <header className="flex shrink-0 items-center justify-between border-b border-border-subtle bg-surface px-4 py-2.5 pt-safe lg:hidden">
          <Wordmark size="sm" href="/app" />
          <AccountMenuTrigger compact />
        </header>

        {/* Does not scroll itself — chat pins a composer and scrolls only its
            message list, so each screen opts into scrolling explicitly. */}
        <main className="flex min-h-0 flex-1 flex-col overflow-hidden">
          {children}
        </main>

        <AppTabBar />
      </div>
    </div>
  );
}
