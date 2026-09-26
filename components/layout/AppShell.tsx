import { AppSidebar, AppTabBar } from "./AppNav";
import { AppMobileHeader } from "./AppMobileHeader";
import { ViewportLock } from "./ViewportLock";

/**
 * The gated app's frame: sidebar from lg up, mobile header plus bottom tab bar
 * below it.
 *
 * Height is 100svh — the SMALL viewport, i.e. the height with the browser
 * toolbars expanded.
 *
 * This is the whole fix for the dead scroll band. `html` is `height: 100%`,
 * which resolves against the layout viewport, but `100dvh` GROWS past that when
 * iOS Safari retracts its toolbars. The shell then became taller than the
 * document and the page itself scrolled — so the header and messages slid off
 * the top and you were left staring at the composer, the tab bar and a slab of
 * empty canvas, which looks exactly like the chat screen disappearing.
 *
 * `svh` is by definition never larger than the layout viewport, so the shell can
 * never overflow the document and there is nothing to scroll. <ViewportLock />
 * belts-and-braces it by locking overflow while a gated screen is mounted.
 *
 * `shrink-0` is load-bearing, not decoration. <body> is `flex flex-col`, so this
 * div is a FLEX ITEM with the default flex-shrink: 1. Once <ViewportLock/> set
 * overflow:hidden on body, body gained a definite height and this item was free
 * to shrink below its 100svh — collapsing to its content: a ~40px header band,
 * `main` flexed to zero, then the composer and tab bar. Which looks precisely
 * like the chat screen vanishing, and cost several wrong diagnoses.
 *
 * Do NOT "fix" that by making the shell `fixed inset-0` either — that was tried,
 * and out of flow it loses its resolved height, so `main` (flex-1 min-h-0)
 * flexes to zero and the layout genuinely does collapse.
 */
export function AppShell({
  children,
  sidebarFooter,
}: {
  children: React.ReactNode;
  sidebarFooter?: React.ReactNode;
}) {
  return (
    <div className="flex h-[100svh] shrink-0 overflow-hidden bg-canvas">
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
