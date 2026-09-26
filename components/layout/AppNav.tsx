"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { Icon } from "@/components/ui/Icon";
import { Wordmark } from "@/components/brand/Wordmark";
import { NAV_ITEMS } from "./nav-items";

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
                    "flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition-colors",
                    active
                      ? "bg-brand-50 text-brand-800"
                      : "text-ink-muted hover:bg-surface-sunken hover:text-ink"
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
      <ul className="flex">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          return (
            <li key={item.href} className="flex-1">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold transition-colors",
                  active ? "text-brand-700" : "text-ink-muted"
                )}
              >
                <Icon name={item.icon} size={22} />
                {/* Label always shown — icon-only tabs hurt discoverability. */}
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
