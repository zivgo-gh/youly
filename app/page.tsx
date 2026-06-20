"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { getProfile } from "@/lib/storage";
import { loadProfile } from "@/lib/db";
import { runMigration } from "@/lib/migrate";

export default function Home() {
  useEffect(() => {
    async function route() {
      try {
        const supabase = createSupabaseBrowserClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          // Pre-auth flow: intro → consent → login
          const introDone = localStorage.getItem("arc_intro_done");
          if (!introDone) {
            window.location.replace("/intro");
          } else {
            window.location.replace("/login");
          }
          return;
        }

        // Authenticated — migrate legacy data once, then resolve profile from DB
        const uid = user.id;
        await runMigration(uid);

        let profile = getProfile(uid); // cache (migration writes through to it)
        if (!profile) {
          profile = await loadProfile(uid); // DB source of truth (new device)
        }

        if (profile?.onboardingComplete) {
          window.location.replace("/chat");
        } else {
          window.location.replace("/onboarding");
        }
      } catch {
        window.location.replace("/intro");
      }
    }

    route();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-emerald-700">
      <div className="text-emerald-300 text-2xl font-black tracking-tight uppercase animate-pulse">
        Youly
      </div>
    </div>
  );
}
