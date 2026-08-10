"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { getProfile } from "@/lib/storage";
import { loadProfile } from "@/lib/db";
import { runMigration } from "@/lib/migrate";

export default function Home() {
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

        // A failed auth check is not the same as "signed out" — bouncing to /login or
        // /intro here would just ping-pong against the proxy redirect.
        if (authError && !user) {
          setFailed(true);
          return;
        }

        if (!user) {
          // Pre-auth flow: intro → consent → login
          const introDone = localStorage.getItem("arc_intro_done");
          window.location.replace(introDone ? "/login" : "/intro");
          return;
        }

        // Authenticated — migrate/repair legacy data once, then resolve profile from DB
        const uid = user.id;
        await runMigration(uid);

        let profile = getProfile(uid); // cache (migration writes through to it)
        if (!profile) {
          profile = await loadProfile(uid); // DB source of truth; throws if unreadable
        }

        if (profile?.onboardingComplete) {
          window.location.replace("/chat");
        } else {
          window.location.replace("/onboarding");
        }
      } catch (e) {
        // Never fall through to onboarding on an error — that would overwrite a real
        // profile with a freshly-collected one. Surface it and let the user retry.
        console.error("youly routing failed:", e);
        setFailed(true);
      }
    }
    route();
  }, [attempt]);

  if (failed) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-emerald-700 px-8 text-center">
        <p className="text-4xl font-black tracking-tight text-emerald-300 uppercase mb-6">
          Youly
        </p>
        <p className="text-white text-lg font-semibold mb-2">
          Couldn&apos;t load your account
        </p>
        <p className="text-emerald-200 text-sm mb-8">
          Your data is safe — we just couldn&apos;t reach the server. Check your
          connection and try again.
        </p>
        <button
          onClick={() => {
            setFailed(false);
            setAttempt((a) => a + 1);
          }}
          className="px-8 py-3 rounded-2xl bg-white text-emerald-700 font-bold active:scale-95 transition-transform"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-700">
      <div className="text-emerald-300 text-2xl font-black tracking-tight uppercase animate-pulse">
        Youly
      </div>
    </div>
  );
}
