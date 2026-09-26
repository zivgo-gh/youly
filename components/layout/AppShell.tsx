import { AppSidebar, AppTabBar } from "./AppNav";
import { AppMobileHeader } from "./AppMobileHeader";

/**
 * The gated app's frame: sidebar from lg up, mobile header plus bottom tab bar
 * below it.
 *
 * `fixed inset-0` rather than `h-dvh`. h-dvh tracks the viewport, but iOS Safari
 * grows the viewport when the toolbar retracts, so the shell became taller than
 * the document's 100% and the whole page scrolled — leaving a dead band of canvas
 * below the tab bar that you could scroll into. Taking the shell out of flow pins
 * it to the viewport exactly, so the document has nothing to scroll.
 *
 * `overscroll-none` additionally stops the rubber-band at the edges. Each screen
 * still scrolls its own content; only the document is locked.
 */
export function AppShell({
  children,
  sidebarFooter,
}: {
  children: React.ReactNode;
  sidebarFooter?: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 flex overflow-hidden overscroll-none bg-canvas">
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
