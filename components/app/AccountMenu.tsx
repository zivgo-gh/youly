"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { getProfile } from "@/lib/storage";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";

/**
 * Account menu, shared by the sidebar and the mobile header.
 *
 * Extracted from the chat screen, where it was a bottom drawer with no dialog
 * semantics that went full-bleed on desktop. Chat-specific actions (copying the
 * transcript) stayed with the chat screen rather than being dragged in here.
 *
 * The "seed test data" button that used to live here is now development-only — it
 * wrote two weeks of fake food into a real account, one tap away from a real user.
 */
function useAccount() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => {
        const user = data.user;
        if (!user) return;
        setEmail(user.email ?? "");
        setName(getProfile(user.id)?.name ?? "");
      })
      .catch(() => {
        // Non-critical chrome — a failed read just means a thinner menu.
      });
  }, []);

  return { email, name };
}

export function AccountMenuTrigger({
  compact = false,
  variant = "default",
}: {
  compact?: boolean;
  /** "tab" renders it to match AppTabBar's cells so it can sit in the tray. */
  variant?: "default" | "tab";
}) {
  const [open, setOpen] = useState(false);
  const { email, name } = useAccount();
  const initial = name.charAt(0).toUpperCase() || "?";

  async function signOut() {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    window.location.replace("/");
  }

  return (
    <>
      {variant === "tab" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Account menu"
          className="flex min-h-12 w-full flex-col items-center justify-center text-ink-muted transition-colors"
        >
          <span className="flex h-7 w-16 items-center justify-center rounded-full">
            <span className="flex size-6 items-center justify-center rounded-full bg-brand-600 text-[11px] font-bold text-white">
              {initial}
            </span>
          </span>
        </button>
      ) : compact ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Account menu"
          className="flex size-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white"
        >
          {initial}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex w-full min-h-11 items-center gap-3 rounded-2xl px-3 text-left transition-colors hover:bg-surface-sunken"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
            {initial}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-ink">
              {name || "Account"}
            </span>
            <span className="block truncate text-xs text-ink-muted">{email}</span>
          </span>
        </button>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={name || "Account"}
        description={email || undefined}
        footer={
          <Button variant="secondary" fullWidth onClick={signOut}>
            Sign out
          </Button>
        }
      >
        <ul className="space-y-1">
          <li>
            <a
              href="mailto:support@youly.app"
              className="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-medium text-ink-body transition-colors hover:bg-surface-sunken"
            >
              <Icon name="chat" />
              Contact support
            </a>
          </li>
          <li>
            <Link
              href="/privacy"
              className="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-medium text-ink-body transition-colors hover:bg-surface-sunken"
            >
              <Icon name="lock" />
              Privacy policy
            </Link>
          </li>
          <li>
            <Link
              href="/terms"
              className="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-medium text-ink-body transition-colors hover:bg-surface-sunken"
            >
              <Icon name="shield" />
              Terms of use
            </Link>
          </li>
        </ul>
        <p className="mt-5 text-xs leading-relaxed text-ink-muted">
          To delete your account and everything in it, email support and we will
          erase it from our database.
        </p>
      </Sheet>
    </>
  );
}
