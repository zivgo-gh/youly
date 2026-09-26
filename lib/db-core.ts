import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  UserProfile,
  DailyLogs,
  DayLog,
  FoodEntry,
  MealType,
} from "./types";

/**
 * Isomorphic data access — row mapping plus the two reads that both the client and
 * the server need. No "use client", no localStorage.
 *
 * Why this file exists: lib/db.ts is a client module, so a route handler physically
 * cannot import it. That is the actual reason /api/chat and /api/summary ended up
 * accepting `profile` and `logs` from the request body — there was no server-side
 * way to read them. Fixing the structure removes the temptation.
 *
 * Every function takes a SupabaseClient, the same shape lib/chat-tools.ts already
 * proved works on both sides. lib/db.ts keeps its public API and its localStorage
 * write-through and delegates the query and mapping here, so no call site changed.
 */

export interface ProfileRow {
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

export const DEFAULT_COACH_STYLE: UserProfile["coachStyle"] = {
  supportLevel: 5,
  techDepth: 5,
  checkInStyle: "conversational",
  observations: [],
};

export function rowToProfile(r: ProfileRow): UserProfile {
  return {
    name: r.name ?? "",
    age: r.age ?? 0,
    sex: (r.sex as UserProfile["sex"]) ?? "male",
    heightIn: r.height_in ?? 0,
    currentWeightLbs: r.current_weight_lbs ?? 0,
    goalWeightLbs: r.goal_weight_lbs ?? 0,
    activityLevel:
      (r.activity_level as UserProfile["activityLevel"]) ?? "sedentary",
    dailyCalorieTarget: r.daily_calorie_target ?? 0,
    dailyProteinTarget: r.daily_protein_target ?? 0,
    dailyDeficit: r.daily_deficit ?? 500,
    coachAvatar: (r.coach_avatar as UserProfile["coachAvatar"]) ?? "alex",
    coachStyle: r.coach_style ?? DEFAULT_COACH_STYLE,
    interestedInFitness: r.interested_in_fitness ?? false,
    habits: r.habits ?? "",
    challenges: r.challenges ?? [],
    predictedGoalDate: r.predicted_goal_date ?? "",
    onboardingComplete: r.onboarding_complete ?? false,
    createdAt: r.created_at ?? new Date().toISOString(),
  };
}

export function profileToRow(uid: string, p: UserProfile) {
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

export interface FoodEntryRow {
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

export function rowToEntry(r: FoodEntryRow): FoodEntry {
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

export function entryToRow(uid: string, date: string, e: FoodEntry) {
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

export function recalc(day: DayLog): DayLog {
  return {
    ...day,
    totalCalories: day.entries.reduce((s, e) => s + e.estimatedCalories, 0),
    totalProtein: day.entries.reduce((s, e) => s + e.estimatedProtein, 0),
  };
}

/**
 * A failed READ must never be mistaken for "this user has no profile" — that
 * mistake routes an existing user into onboarding and overwrites their real
 * profile. Callers get null only when the row authoritatively does not exist.
 */
export class ProfileLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileLoadError";
  }
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** Returns the profile, null if the row genuinely doesn't exist, throws if unreadable. */
export async function loadProfileFrom(
  supabase: SupabaseClient,
  uid: string
): Promise<UserProfile | null> {
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
      return rowToProfile(data as ProfileRow);
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
  }

  throw new ProfileLoadError(lastError || "profile read failed");
}

/** Assembles food_entries + weights into the DailyLogs shape the app consumes. */
export async function loadLogsFrom(
  supabase: SupabaseClient,
  uid: string
): Promise<DailyLogs> {
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
  for (const w of (weights ?? []) as {
    local_date: string;
    weight_lbs: number;
  }[]) {
    dayFor(w.local_date).weightLbs = w.weight_lbs;
  }

  for (const date of Object.keys(logs)) {
    const day = logs[date];
    day.entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
    logs[date] = recalc(day);
  }

  return logs;
}
