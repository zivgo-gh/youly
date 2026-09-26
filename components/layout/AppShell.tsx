import { AppSidebar, AppTabBar } from "./AppNav";
import { AppMobileHeader } from "./AppMobileHeader";
import { ViewportLock } from "./ViewportLock";

/**
 * The gated app's frame: sidebar from lg up, mobile header plus bottom tab bar
 * below it.
 *
 * h-dvh, NOT `fixed inset-0`. Pinning the shell out of flow seemed like the
 * tidy way to stop the document scrolling, but on iOS it collapsed the layout —
 * the shell lost its resolved height, `main` flexed to nothing, and the composer
 * and tab bar stacked at the top of an empty screen. <ViewportLock /> takes away
 * the document's scroll instead, leaving this layout untouched.
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
      <ViewportLock />
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
