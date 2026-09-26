"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { Wordmark } from "@/components/brand/Wordmark";
import { NAV_ITEMS } from "./nav-items";
import { AccountMenuTrigger } from "@/components/app/AccountMenu";

/**
 * Persistent in-app navigation — bottom tabs on mobile, sidebar from lg up.
 *
 * There was no persistent nav at all before: /meals was unreachable from the
 * mobile header, and there was no path between /progress and /meals without
 * going back through /chat. Every link was also a raw <a href>, so each move
 * was a full page reload that threw away React state.
 */
function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppSidebar({ footer }: { footer?: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border-subtle bg-surface lg:flex">
      <div className="px-5 py-5">
        <Wordmark size="md" href="/app" />
      </div>
      <nav aria-label="Main" className="flex-1 px-3">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(pathname, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm transition-colors",
                    active
                      ? "bg-brand-100 font-bold text-brand-800 before:absolute before:left-0 before:top-1/2 before:h-5 before:w-1 before:-translate-y-1/2 before:rounded-r-full before:bg-brand-700"
                      : "font-semibold text-ink-muted hover:bg-surface-sunken hover:text-ink"
                  )}
                >
                  <Icon name={item.icon} />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      {footer ? <div className="border-t border-border-subtle p-4">{footer}</div> : null}
    </aside>
  );
}

export function AppTabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main"
      className="shrink-0 border-t border-border-subtle bg-surface pb-safe lg:hidden"
    >
      <ul className="flex items-stretch">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                // Icon-only by request, to give the conversation more room. The
                // label still exists for assistive tech via sr-only, so the tab
                // is announced even though it isn't drawn.
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center transition-colors",
                  active ? "text-brand-700" : "text-ink-muted"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-16 items-center justify-center rounded-full transition-colors",
                    active && "bg-brand-100"
                  )}
                >
                  <Icon name={item.icon} size={22} />
                </span>
                <span className="sr-only">{item.label}</span>
              </Link>
            </li>
          );
        })}
        {/* Account lives in the tray rather than the chat header, so the
            conversation keeps that row. */}
        <li className="flex-1">
          <AccountMenuTrigger variant="tab" />
        </li>
      </ul>
    </nav>
  );
}
