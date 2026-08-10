"use client";

// Single place where "which screen does this user belong on?" is decided.
//
// The critical distinction: a profile that could not be READ is not a profile that
// does not EXIST. Every caller must be able to tell those apart, because sending an
// existing user to /onboarding overwrites their real profile with a new one.

import { createSupabaseBrowserClient } from "./supabase-browser";
import { getProfile } from "./storage";
import { loadProfile } from "./db";
import type { UserProfile } from "./types";

export type ProfileResolution =
  | { status: "ok"; uid: string; profile: UserProfile }
  | { status: "signed-out" }
  | { status: "needs-onboarding"; uid: string }
  | { status: "error"; message: string };

export async function resolveProfile(): Promise<ProfileResolution> {
  try {
    const supabase = createSupabaseBrowserClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user) {
      // Couldn't complete the auth check → error, not "signed out".
      return authError
        ? { status: "error", message: authError.message }
        : { status: "signed-out" };
    }

    const uid = user.id;
    const profile = getProfile(uid) ?? (await loadProfile(uid)); // throws if unreadable
    if (!profile || !profile.onboardingComplete) return { status: "needs-onboarding", uid };
    return { status: "ok", uid, profile };
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : String(e) };
  }
}
