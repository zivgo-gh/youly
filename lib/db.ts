"use client";

import { createSupabaseBrowserClient } from "./supabase-browser";
import { normalizeFoodName } from "./chat-tools";
import {
  ProfileLoadError,
  loadProfileFrom,
  loadLogsFrom,
  profileToRow,
  entryToRow,
  recalc,
} from "./db-core";

// Re-exported so existing importers keep working unchanged.
export { ProfileLoadError };
import type {
  UserProfile,
  DailyLogs,
  FoodEntry,
  MealType,
  SavedMeal,
  SavedMealItem,
  FoodReference,
} from "./types";

// ─── Cache mirror (localStorage) ──────────────────────────────────────────────
// Keeps the synchronous getters in lib/storage.ts consistent for instant first paint.

function profileKey(uid: string) {
  return `arc_profile_${uid}`;
}
function logsKey(uid: string) {
  return `arc_logs_${uid}`;
}

function cacheProfile(uid: string, profile: UserProfile) {
  try {
    localStorage.setItem(profileKey(uid), JSON.stringify(profile));
  } catch {
    /* non-fatal */
  }
}

function cacheLogs(uid: string, logs: DailyLogs) {
  try {
    localStorage.setItem(logsKey(uid), JSON.stringify(logs));
  } catch {
    /* non-fatal */
  }
}

function readCachedLogs(uid: string): DailyLogs {
  try {
    const raw = localStorage.getItem(logsKey(uid));
    return raw ? (JSON.parse(raw) as DailyLogs) : {};
  } catch {
    return {};
  }
}

// Apply a mutation to the cached DailyLogs so the next synchronous read is consistent.
function mutateCache(uid: string, fn: (logs: DailyLogs) => void) {
  const logs = readCachedLogs(uid);
  fn(logs);
  cacheLogs(uid, logs);
}

// ─── Row <-> model mappers ────────────────────────────────────────────────────

// ─── Profile ──────────────────────────────────────────────────────────────────

// Returns the profile, or null ONLY when the row genuinely does not exist.
// Throws ProfileLoadError if the read could not be completed (network/auth/RLS).
export async function loadProfile(uid: string): Promise<UserProfile | null> {
  const profile = await loadProfileFrom(createSupabaseBrowserClient(), uid);
  if (profile) cacheProfile(uid, profile);
  return profile;
}

export async function saveProfileDb(uid: string, profile: UserProfile): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase
    .from("profiles")
    .upsert(profileToRow(uid, profile), { onConflict: "user_id" });
  cacheProfile(uid, profile);
  // Surface the failure — a silently-dropped write leaves the profile local-only,
  // so it vanishes the moment localStorage is cleared.
  if (error) throw new Error(`profile save failed: ${error.message}`);
}

// ─── Logs (food_entries + weights assembled into DailyLogs) ───────────────────

export async function loadLogs(uid: string): Promise<DailyLogs> {
  const logs = await loadLogsFrom(createSupabaseBrowserClient(), uid);
  cacheLogs(uid, logs);
  return logs;
}

export async function addFoodEntryDb(uid: string, date: string, entry: FoodEntry): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  await supabase.from("food_entries").insert(entryToRow(uid, date, entry));
  mutateCache(uid, (logs) => {
    const day = logs[date] ?? { entries: [], totalCalories: 0, totalProtein: 0 };
    day.entries = [...day.entries, entry];
    logs[date] = recalc(day);
  });
}

export async function correctFoodEntryDb(
  uid: string,
  date: string,
  entryId: string,
  updates: Partial<Pick<FoodEntry, "description" | "estimatedCalories" | "estimatedProtein">>
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const patch: Record<string, unknown> = { corrected: true };
  if (updates.description !== undefined) patch.description = updates.description;
  if (updates.estimatedCalories !== undefined) patch.calories = Math.round(updates.estimatedCalories);
  if (updates.estimatedProtein !== undefined) patch.protein = updates.estimatedProtein;
  await supabase.from("food_entries").update(patch).eq("id", entryId).eq("user_id", uid);
  mutateCache(uid, (logs) => {
    const day = logs[date];
    if (!day) return;
    day.entries = day.entries.map((e) =>
      e.id === entryId ? { ...e, ...updates, corrected: true } : e
    );
    logs[date] = recalc(day);
  });
}

export async function deleteFoodEntryDb(uid: string, date: string, entryId: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  await supabase.from("food_entries").delete().eq("id", entryId).eq("user_id", uid);
  mutateCache(uid, (logs) => {
    const day = logs[date];
    if (!day) return;
    day.entries = day.entries.filter((e) => e.id !== entryId);
    logs[date] = recalc(day);
  });
}

export async function logWeightDb(uid: string, date: string, weightLbs: number): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  await supabase
    .from("weights")
    .upsert({ user_id: uid, local_date: date, weight_lbs: weightLbs }, { onConflict: "user_id,local_date" });
  mutateCache(uid, (logs) => {
    const day = logs[date] ?? { entries: [], totalCalories: 0, totalProtein: 0 };
    logs[date] = { ...day, weightLbs };
  });
}

// ─── Saved meals ──────────────────────────────────────────────────────────────

interface SavedMealRow {
  id: string;
  name: string;
  meal: string;
  created_at: string;
}
interface SavedMealItemRow {
  id: string;
  meal_id: string;
  description: string;
  calories: number;
  protein: number;
  position: number;
}

export async function getSavedMeals(uid: string): Promise<SavedMeal[]> {
  const supabase = createSupabaseBrowserClient();
  const [{ data: meals }, { data: items }] = await Promise.all([
    supabase.from("saved_meals").select("*").eq("user_id", uid).order("created_at", { ascending: true }),
    supabase.from("saved_meal_items").select("*").eq("user_id", uid).order("position", { ascending: true }),
  ]);

  const itemsByMeal = new Map<string, SavedMealItem[]>();
  for (const it of (items ?? []) as SavedMealItemRow[]) {
    const arr = itemsByMeal.get(it.meal_id) ?? [];
    arr.push({ id: it.id, description: it.description, calories: it.calories, protein: it.protein });
    itemsByMeal.set(it.meal_id, arr);
  }

  const perCategoryCount: Partial<Record<MealType, number>> = {};
  return ((meals ?? []) as SavedMealRow[]).map((m, idx) => {
    const meal = m.meal as MealType;
    perCategoryCount[meal] = (perCategoryCount[meal] ?? 0) + 1;
    return {
      id: m.id,
      name: m.name,
      meal,
      items: itemsByMeal.get(m.id) ?? [],
      categoryNumber: perCategoryCount[meal]!,
      globalNumber: idx + 1,
    };
  });
}

export async function createSavedMeal(
  uid: string,
  name: string,
  meal: MealType,
  items: SavedMealItem[]
): Promise<SavedMeal | null> {
  const supabase = createSupabaseBrowserClient();
  const { data: mealRow, error } = await supabase
    .from("saved_meals")
    .insert({ user_id: uid, name, meal })
    .select("id")
    .single();
  if (error || !mealRow) return null;
  const mealId = (mealRow as { id: string }).id;
  if (items.length > 0) {
    await supabase.from("saved_meal_items").insert(
      items.map((it, i) => ({
        meal_id: mealId,
        user_id: uid,
        description: it.description,
        calories: Math.round(it.calories),
        protein: it.protein,
        position: i,
      }))
    );
  }
  const all = await getSavedMeals(uid);
  return all.find((m) => m.id === mealId) ?? null;
}

export async function updateSavedMeal(
  uid: string,
  id: string,
  name: string,
  meal: MealType,
  items: SavedMealItem[]
): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  await supabase.from("saved_meals").update({ name, meal }).eq("id", id).eq("user_id", uid);
  await supabase.from("saved_meal_items").delete().eq("meal_id", id).eq("user_id", uid);
  if (items.length > 0) {
    await supabase.from("saved_meal_items").insert(
      items.map((it, i) => ({
        meal_id: id,
        user_id: uid,
        description: it.description,
        calories: Math.round(it.calories),
        protein: it.protein,
        position: i,
      }))
    );
  }
}

export async function deleteSavedMeal(uid: string, id: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  await supabase.from("saved_meals").delete().eq("id", id).eq("user_id", uid);
}

// ─── Shared food reference ────────────────────────────────────────────────────

export async function lookupFoodReference(
  name: string,
  unit?: string
): Promise<FoodReference | null> {
  const supabase = createSupabaseBrowserClient();
  const normalized = normalizeFoodName(name);
  let query = supabase.from("food_reference").select("*").eq("normalized_name", normalized);
  if (unit) query = query.eq("unit", unit);
  const { data } = await query.order("confirmations", { ascending: false }).limit(1);
  const row = (data ?? [])[0] as
    | { normalized_name: string; unit: string; calories: number; protein: number; confirmations: number }
    | undefined;
  if (!row) return null;
  return {
    normalizedName: row.normalized_name,
    unit: row.unit,
    calories: row.calories,
    protein: row.protein,
    confirmations: row.confirmations,
  };
}
