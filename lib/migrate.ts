"use client";

// One-time, idempotent migration of pre-DB data into the normalized Supabase tables.
// Sources (in priority order): the local cache, then the legacy profile_backups / log_backups
// jsonb tables. Idempotency: food rows reuse the original FoodEntry.id and are inserted with
// ON CONFLICT DO NOTHING, so re-running never duplicates.

import { createSupabaseBrowserClient } from "./supabase-browser";
import { getProfile, getAllLogs } from "./storage";
import { saveProfileDb } from "./db";
import type { UserProfile, DailyLogs } from "./types";

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export async function runMigration(uid: string): Promise<void> {
  if (typeof window === "undefined") return;
  const flag = `arc_migrated_${uid}`;
  if (localStorage.getItem(flag) === "1") return;

  const supabase = createSupabaseBrowserClient();

  // Short-circuit: if the user already has DB rows, assume migrated.
  const { count } = await supabase
    .from("food_entries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", uid);
  if ((count ?? 0) > 0) {
    localStorage.setItem(flag, "1");
    return;
  }

  // ── Source: profile ──
  let profile: UserProfile | null = getProfile(uid);
  if (!profile) {
    const { data } = await supabase.from("profile_backups").select("data").eq("user_id", uid).maybeSingle();
    profile = ((data as { data?: UserProfile } | null)?.data as UserProfile) ?? null;
  }

  // ── Source: logs ──
  let logs: DailyLogs = getAllLogs(uid);
  if (!logs || Object.keys(logs).length === 0) {
    const { data } = await supabase.from("log_backups").select("data").eq("user_id", uid).maybeSingle();
    logs = ((data as { data?: DailyLogs } | null)?.data as DailyLogs) ?? {};
  }

  if (!profile && Object.keys(logs).length === 0) {
    // Nothing to migrate (fresh account). Mark done so we don't re-check every login.
    localStorage.setItem(flag, "1");
    return;
  }

  try {
    if (profile) await saveProfileDb(uid, profile);

    const entryRows: Record<string, unknown>[] = [];
    const weightRows: Record<string, unknown>[] = [];
    for (const [date, day] of Object.entries(logs)) {
      for (const e of day.entries ?? []) {
        entryRows.push({
          id: e.id,
          user_id: uid,
          local_date: date,
          ts: e.timestamp,
          description: e.description,
          calories: Math.round(e.estimatedCalories ?? 0),
          protein: e.estimatedProtein ?? 0, // coalesce null protein → 0
          meal: e.meal ?? null,
          corrected: e.corrected ?? false,
          source: "migration",
        });
      }
      if (day.weightLbs != null) {
        weightRows.push({ user_id: uid, local_date: date, weight_lbs: day.weightLbs });
      }
    }

    for (const c of chunk(entryRows, 500)) {
      const { error } = await supabase.from("food_entries").upsert(c, { onConflict: "id", ignoreDuplicates: true });
      if (error) throw error;
    }
    for (const c of chunk(weightRows, 500)) {
      const { error } = await supabase.from("weights").upsert(c, { onConflict: "user_id,local_date", ignoreDuplicates: true });
      if (error) throw error;
    }

    localStorage.setItem(flag, "1");
  } catch (e) {
    // Leave the flag unset so the next login retries. ON CONFLICT DO NOTHING keeps retries safe.
    console.error("youly migration failed:", e);
  }
}
