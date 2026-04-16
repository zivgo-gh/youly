"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { getProfile, hasConsented, restoreFromCloud } from "@/lib/storage";

export default function Home() {
  const [status, setStatus] = useState("Starting…");

  useEffect(() => {
    async function route() {
      try {
        setStatus("Creating Supabase client…");
        const supabase = createSupabaseBrowserClient();

        setStatus("Checking session…");
        const { data: { user }, error } = await supabase.auth.getUser();

        if (error) {
          setStatus("Auth error: " + error.message);
          setTimeout(() => window.location.replace("/login"), 2000);
          return;
        }

        if (!user) {
          setStatus("No session → /login");
          window.location.replace("/login");
          return;
        }

        setStatus("Session found: " + user.email);
        const uid = user.id;

        if (!hasConsented(uid)) {
          setStatus("No consent → /consent");
          window.location.replace("/consent");
          return;
        }

        setStatus("Consent found, checking profile…");
        let profile = getProfile(uid);

        if (!profile) {
          setStatus("No local profile, trying cloud restore…");
          await restoreFromCloud(uid);
          profile = getProfile(uid);
        }

        if (profile?.onboardingComplete) {
          setStatus("Profile found → /chat");
          window.location.replace("/chat");
        } else {
          setStatus("No profile → /onboarding");
          window.location.replace("/onboarding");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setStatus("Error: " + msg);
        setTimeout(() => window.location.replace("/login"), 2000);
      }
    }

    route();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 gap-4 px-6">
      <div className="text-emerald-600 text-2xl font-black tracking-tight uppercase animate-pulse">
        Youly
      </div>
      <div className="text-xs text-gray-400 text-center">{status}</div>
    </div>
  );
}
