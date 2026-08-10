"use client";

import { createSupabaseBrowserClient } from "./supabase-browser";
import { normalizeFoodName } from "./chat-tools";
import type {
  UserProfile,
  DailyLogs,
  DayLog,
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

function recalc(day: DayLog): DayLog {
  return {
    ...day,
    totalCalories: day.entries.reduce((s, e) => s + e.estimatedCalories, 0),
    totalProtein: day.entries.reduce((s, e) => s + e.estimatedProtein, 0),
  };
}

// Apply a mutation to the cached DailyLogs so the next synchronous read is consistent.
function mutateCache(uid: string, fn: (logs: DailyLogs) => void) {
  const logs = readCachedLogs(uid);
  fn(logs);
  cacheLogs(uid, logs);
}

// ─── Row <-> model mappers ────────────────────────────────────────────────────

interface ProfileRow {
  name: string | null;
  age: number | null;
  sex: string | null;
  height_in: number | null;
  current_weight_lbs: number | null;
  goal_weight_lbs: number | null;
  activity_level: string | null;
  daily_calorie_target: number | null;
  daily_protein_target: number | null;
  daily_deficit: number | null;
  coach_avatar: string | null;
  coach_style: UserProfile["coachStyle"];
  interested_in_fitness: boolean | null;
  habits: string | null;
  challenges: string[] | null;
  predicted_goal_date: string | null;
  onboarding_complete: boolean | null;
  created_at: string | null;
}

function rowToProfile(r: ProfileRow): UserProfile {
  return {
    name: r.name ?? "",
    age: r.age ?? 0,
    sex: (r.sex as UserProfile["sex"]) ?? "male",
    heightIn: r.height_in ?? 0,
    currentWeightLbs: r.current_weight_lbs ?? 0,
    goalWeightLbs: r.goal_weight_lbs ?? 0,
    activityLevel: (r.activity_level as UserProfile["activityLevel"]) ?? "sedentary",
    dailyCalorieTarget: r.daily_calorie_target ?? 0,
    dailyProteinTarget: r.daily_protein_target ?? 0,
    dailyDeficit: r.daily_deficit ?? 500,
    coachAvatar: (r.coach_avatar as UserProfile["coachAvatar"]) ?? "alex",
    coachStyle: r.coach_style ?? {
      supportLevel: 5,
      techDepth: 5,
      checkInStyle: "conversational",
      observations: [],
    },
    interestedInFitness: r.interested_in_fitness ?? false,
    habits: r.habits ?? "",
    challenges: r.challenges ?? [],
    predictedGoalDate: r.predicted_goal_date ?? "",
    onboardingComplete: r.onboarding_complete ?? false,
    createdAt: r.created_at ?? new Date().toISOString(),
  };
}

function profileToRow(uid: string, p: UserProfile) {
  return {
    user_id: uid,
    name: p.name,
    age: p.age,
    sex: p.sex,
    height_in: p.heightIn,
    current_weight_lbs: p.currentWeightLbs,
    goal_weight_lbs: p.goalWeightLbs,
    activity_level: p.activityLevel,
    daily_calorie_target: p.dailyCalorieTarget,
    daily_protein_target: p.dailyProteinTarget,
    daily_deficit: p.dailyDeficit,
    coach_avatar: p.coachAvatar,
    coach_style: p.coachStyle,
    interested_in_fitness: p.interestedInFitness,
    habits: p.habits,
    challenges: p.challenges,
    predicted_goal_date: p.predictedGoalDate,
    onboarding_complete: p.onboardingComplete,
    updated_at: new Date().toISOString(),
  };
}

interface FoodEntryRow {
  id: string;
  local_date: string;
  ts: string;
  description: string;
  calories: number;
  protein: number;
  meal: string | null;
  corrected: boolean;
  source: string | null;
}

function rowToEntry(r: FoodEntryRow): FoodEntry {
  return {
    id: r.id,
    timestamp: r.ts,
    description: r.description,
    estimatedCalories: r.calories,
    estimatedProtein: r.protein,
    meal: (r.meal as MealType | null) ?? undefined,
    corrected: r.corrected,
    source: (r.source as FoodEntry["source"]) ?? undefined,
  };
}

function entryToRow(uid: string, date: string, e: FoodEntry) {
  return {
    id: e.id,
    user_id: uid,
    local_date: date,
    ts: e.timestamp,
    description: e.description,
    calories: Math.round(e.estimatedCalories),
    protein: e.estimatedProtein,
    meal: e.meal ?? null,
    corrected: e.corrected ?? false,
    source: e.source ?? "ai",
  };
}

// ─── Profile ──────────────────────────────────────────────────────────────────

// A failed READ must never be mistaken for "this user has no profile" — that
// mistake routes an existing user into onboarding and overwrites their real profile.
export class ProfileLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileLoadError";
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Returns the profile, or null ONLY when the row genuinely does not exist.
// Throws ProfileLoadError if the read could not be completed (network/auth/RLS).
export async function loadProfile(uid: string): Promise<UserProfile | null> {
  const supabase = createSupabaseBrowserClient();
  let lastError = "";

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await sleep(400 * attempt);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", uid)
        .maybeSingle();
      if (error) {
        lastError = error.message;
        continue; // transient? retry before concluding anything
      }
      if (!data) return null; // authoritative: no profile row for this uid
      const profile = rowToProfile(data as ProfileRow);
      cacheProfile(uid, profile);
      return profile;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  throw new ProfileLoadError(lastError || "profile read failed");
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
  const supabase = createSupabaseBrowserClient();
  const [{ data: entries }, { data: weights }] = await Promise.all([
    supabase.from("food_entries").select("*").eq("user_id", uid),
    supabase.from("weights").select("*").eq("user_id", uid),
  ]);

  const logs: DailyLogs = {};
  const dayFor = (date: string): DayLog =>
    (logs[date] ??= { entries: [], totalCalories: 0, totalProtein: 0 });

  for (const r of (entries ?? []) as FoodEntryRow[]) {
    dayFor(r.local_date).entries.push(rowToEntry(r));
  }
  for (const w of (weights ?? []) as { local_date: string; weight_lbs: number }[]) {
    dayFor(w.local_date).weightLbs = w.weight_lbs;
  }

  for (const date of Object.keys(logs)) {
    const day = logs[date];
    day.entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    logs[date] = recalc(day);
  }

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
