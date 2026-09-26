"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { runMigration } from "@/lib/migrate";
import { resolveProfile } from "@/lib/resolve-profile";
import { LoadFailure } from "@/components/shared/LoadFailure";
import { LoadingScreen } from "@/components/ui/Feedback";

/**
 * The safe, client-side half of the routing decision — this is the old
 * app/page.tsx gate, minus the pre-auth branch that the marketing homepage now
 * owns.
 *
 * Ordering is load-bearing: runMigration MUST finish before the profile is read.
 * migrate.ts can recover a profile from the local cache or legacy profile_backups,
 * so reading first would classify a returning user as brand new and overwrite
 * their data. app/app/page.tsx deliberately refuses to make that call and hands
 * ambiguous cases here.
 */
export default function AppStartPage() {
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    async function route() {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        // A failed auth check is not "signed out" — bouncing to /login here would
        // ping-pong against the proxy redirect.
        if (authError && !user) {
          setFailed(true);
          return;
        }
        if (!user) {
          window.location.replace("/login?next=/app");
          return;
        }

        await runMigration(user.id);

        const r = await resolveProfile();
        if (r.status === "error") {
          setFailed(true);
          return;
        }
        if (r.status === "signed-out") {
          window.location.replace("/login?next=/app");
          return;
        }
        window.location.replace(
          r.status === "needs-onboarding" ? "/app/onboarding" : "/app/chat"
        );
      } catch (e) {
        // Never fall through to onboarding on an error — that overwrites a real
        // profile with a freshly collected one.
        console.error("youly routing failed:", e);
        setFailed(true);
      }
    }
    route();
  }, [attempt]);

  if (failed) {
    return (
      <LoadFailure
        onRetry={() => {
          setFailed(false);
          setAttempt((a) => a + 1);
        }}
      />
    );
  }

  return <LoadingScreen label="Getting your coach ready" />;
}
