import { AppSidebar, AppTabBar } from "./AppNav";
import { AppMobileHeader } from "./AppMobileHeader";

/**
 * The gated app's frame: sidebar from lg up, mobile header plus bottom tab bar
 * below it.
 *
 * Uses h-dvh. Several attempts to also stop the document scrolling past this
 * shell — `fixed inset-0`, then 100svh, then a body overflow lock, then
 * `shrink-0` — each broke the layout worse than the scroll band they targeted.
 * The dead scroll band is handled in globals.css instead, via a :has() rule that
 * locks html/body when [data-app-shell] is present. The shell keeps h-dvh so it
 * still works if :has() is unsupported; max-h-full stops it exceeding the locked
 * body and clipping the tab bar. Do NOT move that fix back onto this element.
 */
export function AppShell({
  children,
  sidebarFooter,
}: {
  children: React.ReactNode;
  sidebarFooter?: React.ReactNode;
}) {
  return (
    <div data-app-shell className="flex h-dvh max-h-full overflow-hidden bg-canvas">
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
