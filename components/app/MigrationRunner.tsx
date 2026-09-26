"use client";

import { useEffect, useRef } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { runMigration } from "@/lib/migrate";

/**
 * Runs the one-time legacy localStorage -> Postgres migration.
 *
 * It lives in the app layout so a deep link straight to /app/chat still repairs a
 * returning user's data, not just an entry through /app. `runMigration` is
 * idempotent and guarded by per-uid localStorage flags, so extra mounts are free.
 *
 * Renders nothing and never blocks — /app/start is the path that awaits it before
 * making the profile decision.
 */
export function MigrationRunner() {
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    (async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (user) await runMigration(user.id);
      } catch (e) {
        // A failed migration leaves its flags unset and retries on the next load,
        // so swallowing here is safe — surfacing it would be noise.
        console.error("youly migration failed:", e);
      }
    })();
  }, []);

  return null;
}
