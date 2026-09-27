import { AppSidebar, AppTabBar } from "./AppNav";
import { AppMobileHeader } from "./AppMobileHeader";

/**
 * The gated app's frame: sidebar from lg up, mobile header plus bottom tab bar
 * below it.
 *
 * Uses h-dvh. DO NOT try to stop the document scrolling past this shell without
 * a real device to test on. Five attempts, all shipped to production, all broke
 * the chat screen and all had to be reverted:
 *
 *   1. `fixed inset-0`        — out of flow, lost its resolved height
 *   2. body overflow lock (JS) — froze the user at a restored scroll offset
 *   3. `100svh`               — no effect on the real cause
 *   4. `shrink-0`             — no effect on the real cause
 *   5. `html:has([data-app-shell])` document lock in CSS — broke it too
 *
 * The dead band of canvas below the tab bar is COSMETIC. A chat screen that
 * doesn't render is not. The symptom is also not reproducible from the markup:
 * it needs Chrome DevTools attached to a phone, comparing this element's
 * computed height against window.innerHeight and document.body.scrollHeight.
 * Get those three numbers before changing anything here.
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
