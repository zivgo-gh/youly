"use client";

import { usePathname } from "next/navigation";
import { Wordmark } from "@/components/brand/Wordmark";
import { AccountMenuTrigger } from "@/components/app/AccountMenu";

/**
 * The phone header for gated screens.
 *
 * It hides itself on /app/chat. On a phone the conversation is the product, and
 * a wordmark row there cost ~50px of chat for no information the tab bar wasn't
 * already giving ("Coach" is lit). Chat renders its own combined row instead,
 * folding the account button in beside the date.
 *
 * Because this disappears there, /app/chat's own first row must carry `pt-safe`
 * — otherwise its content runs under the notch.
 */
export function AppMobileHeader() {
  const pathname = usePathname();
  if (pathname === "/app/chat") return null;

  return (
    <header className="flex shrink-0 items-center justify-between border-b border-border-subtle bg-surface px-4 py-2.5 pt-safe lg:hidden">
      <Wordmark size="sm" href="/app" />
      <AccountMenuTrigger compact />
    </header>
  );
}
