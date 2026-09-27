import { AppSidebar, AppTabBar } from "./AppNav";
import { AppMobileHeader } from "./AppMobileHeader";

/**
 * The gated app's frame: sidebar from lg up, mobile header plus bottom tab bar
 * below it.
 *
 * Uses h-dvh. Several attempts to also stop the document scrolling past this
 * shell — `fixed inset-0`, then 100svh, then a body overflow lock, then
 * `shrink-0` — each broke the layout worse than the scroll band they targeted.
 * Reverted to the version that renders correctly. The dead scroll band below the
 * tab bar is a known, cosmetic annoyance; do not attempt it again without a real
 * device to test on, because it is not reproducible from the markup alone.
 */
export function AppShell({
  children,
  sidebarFooter,
}: {
  children: React.ReactNode;
  sidebarFooter?: React.ReactNode;
}) {
  return (
    <div className="flex h-dvh overflow-hidden bg-canvas">
      <AppSidebar footer={sidebarFooter} />

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Hidden entirely on /app/chat, which folds the account button into its
            own date row to give the conversation another ~50px. */}
        <AppMobileHeader />

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
