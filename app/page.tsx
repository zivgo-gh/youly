"use client";

import { useEffect } from "react";
import { getProfile } from "@/lib/storage";

export default function Home() {
  useEffect(() => {
    const profile = getProfile();
    if (profile?.onboardingComplete) {
      window.location.replace("/chat");
    } else {
      window.location.replace("/onboarding");
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-emerald-600 text-2xl font-black tracking-tight uppercase animate-pulse">Youly</div>
    </div>
  );
}
