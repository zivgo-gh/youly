"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { ButtonLink } from "@/components/ui/Button";

/**
 * Swaps the call to action once we know whether someone is signed in.
 *
 * This is deliberately a small client component rather than a redirect in
 * proxy.ts. Sending signed-in users from "/" to the app would make the homepage
 * unreachable for exactly the people most likely to link to it, and it would force
 * "/" to be dynamic. Instead "/" stays statically prerendered for everyone and only
 * this button changes after hydration.
 *
 * The signed-out label is the prerendered default, so a crawler — and anyone whose
 * JS hasn't run yet — sees a working CTA.
 */
export function SessionCta({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => {
        if (!cancelled) setSignedIn(Boolean(data.user));
      })
      .catch(() => {
        // Treat an unreadable session as signed out — the worst case is showing
        // "Get started", which still works for someone who has an account.
        if (!cancelled) setSignedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (signedIn) {
    return (
      <ButtonLink href="/app" size={size} className={className}>
        Open Youly
      </ButtonLink>
    );
  }

  return (
    <ButtonLink href="/login" size={size} className={className}>
      Get started free
    </ButtonLink>
  );
}
