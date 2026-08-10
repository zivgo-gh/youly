"use client";

// One-time, idempotent migration of pre-DB data into the normalized Supabase tables.
// Sources (in priority order): the local cache, then the legacy profile_backups / log_backups
// jsonb tables. Idempotency: food rows reuse the original FoodEntry.id and are inserted with
// ON CONFLICT DO NOTHING, so re-running never duplicates.
//
// The profile and the logs migrate INDEPENDENTLY. They used to share one short-circuit
// ("this user already has food_entries rows → assume fully migrated"), which meant a user
// whose entries landed but whose profiles row didn't could never be repaired — on the next
// device they'd look like a brand-new user and be sent back through onboarding.

import { createSupabaseBrowserClient } from "./supabase-browser";
import { getProfile, getAllLogs } from "./storage";
import { loadProfile, saveProfileDb } from "./db";
import type { UserProfile, DailyLogs } from "./types";

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

export function profileMigratedKey(uid: string) {
  return `arc_migrated_profile_${uid}`;
}
export function logsMigratedKey(uid: string) {
  return `arc_migrated_${uid}`;
}

// Ensures a `profiles` row exists for this uid, recovering it from the local cache or the
// legacy profile_backups table if it doesn't. Throws if the DB read/write failed — the caller
// must NOT treat that as "no profile".
async function migrateProfile(uid: string): Promise<void> {
  const flag = profileMigratedKey(uid);
  if (localStorage.getItem(flag) === "1") return;

  const existing = await loadProfile(uid); // throws (rather than lying) on a failed read
  if (existing) {
    localStorage.setItem(flag, "1");
    return;
  }

  // No row in the DB — try to recover one rather than dropping the user into onboarding.
  let profile: UserProfile | null = getProfile(uid);
  if (!profile) {
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase
      .from("profile_backups")
      .select("data")
      .eq("user_id", uid)
      .maybeSingle();
    profile = ((data as { data?: UserProfile } | null)?.data as UserProfile) ?? null;
  }

  if (!profile) {
    // Genuinely a fresh account. Mark done so we don't re-check on every login.
    localStorage.setItem(flag, "1");
    return;
  }

  await saveProfileDb(uid, profile); // throws on failure → flag stays unset → retried next login
  localStorage.setItem(flag, "1");
}

async function migrateLogs(uid: string): Promise<void> {
  const flag = logsMigratedKey(uid);
  if (localStorage.getItem(flag) === "1") return;

  const supabase = createSupabaseBrowserClient();

  // Short-circuit: if the user already has food rows, the logs are migrated.
  const { count, error: countError } = await supabase
    .from("food_entries")
    .select("id", { count: "exact", head: true })
    .eq("user_id", uid);
  if (countError) return; // couldn't tell — leave the flag unset and retry next login
  if ((count ?? 0) > 0) {
    localStorage.setItem(flag, "1");
    return;
  }

  let logs: DailyLogs = getAllLogs(uid);
  if (!logs || Object.keys(logs).length === 0) {
    const { data } = await supabase.from("log_backups").select("data").eq("user_id", uid).maybeSingle();
    logs = ((data as { data?: DailyLogs } | null)?.data as DailyLogs) ?? {};
  }

  if (Object.keys(logs).length === 0) {
    localStorage.setItem(flag, "1");
    return;
  }

  try {
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
    console.error("youly logs migration failed:", e);
  }
}

export async function runMigration(uid: string): Promise<void> {
  if (typeof window === "undefined") return;
  await migrateProfile(uid); // may throw — a failed profile read must not be papered over
  await migrateLogs(uid);
}
