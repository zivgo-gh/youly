import type { DailyLogs, UserProfile, Milestone } from "./types";

// ─── Date helpers ─────────────────────────────────────────────────────────────

function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function todayStr(): string {
  return localDateStr(new Date());
}

/** `days` consecutive dates ending on `endDate` (default today), oldest first. */
export function dateRangeEnding(days: number, endDate?: string): string[] {
  const end = endDate
    ? (() => {
        const [y, m, d] = endDate.split("-").map(Number);
        return new Date(y, m - 1, d);
      })()
    : new Date();
  const result: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(end);
    d.setDate(d.getDate() - i);
    result.push(localDateStr(d));
  }
  return result;
}

export function dateRange(days: number): string[] {
  const result: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push(localDateStr(d));
  }
  return result;
}

export function daysBetween(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const past = new Date(y, m - 1, d);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((now.getTime() - past.getTime()) / 86400000);
}

// ─── Aggregates ───────────────────────────────────────────────────────────────

export interface DayAggregate {
  date: string;
  calories: number;
  protein: number;
  weightLbs: number | null;
  logged: boolean; // whether the user logged anything that day
}

/**
 * A `days`-long window ending on `endDate` (default today).
 *
 * The explicit end date is what lets the progress charts fall back to the last
 * window that actually contains data, rather than rendering an empty axis for a
 * user whose history predates the default window.
 */
export function aggregateWindow(
  logs: DailyLogs,
  days: number,
  endDate?: string
): DayAggregate[] {
  return dateRangeEnding(days, endDate).map((date) => {
    const day = logs[date];
    return {
      date,
      calories: day?.totalCalories ?? 0,
      protein: day?.totalProtein ?? 0,
      weightLbs: day?.weightLbs ?? null,
      logged: (day?.entries?.length ?? 0) > 0,
    };
  });
}

export function aggregateLast(logs: DailyLogs, days: number): DayAggregate[] {
  return dateRange(days).map((date) => {
    const day = logs[date];
    return {
      date,
      calories: day?.totalCalories ?? 0,
      protein: day?.totalProtein ?? 0,
      weightLbs: day?.weightLbs ?? null,
      logged: (day?.entries?.length ?? 0) > 0,
    };
  });
}

export interface WeeklyStats {
  avgCalories: number;
  avgProtein: number;
  daysLogged: number;
  totalDays: number;
  weights: { date: string; lbs: number }[];
}

export function weeklyStats(logs: DailyLogs, days = 7): WeeklyStats {
  const agg = aggregateLast(logs, days);
  const logged = agg.filter((d) => d.logged);
  const avgCalories =
    logged.length > 0
      ? Math.round(logged.reduce((s, d) => s + d.calories, 0) / logged.length)
      : 0;
  const avgProtein =
    logged.length > 0
      ? Math.round(logged.reduce((s, d) => s + d.protein, 0) / logged.length)
      : 0;
  const weights = agg
    .filter((d) => d.weightLbs !== null)
    .map((d) => ({ date: d.date, lbs: d.weightLbs as number }));
  return { avgCalories, avgProtein, daysLogged: logged.length, totalDays: days, weights };
}

// ─── Trajectory ───────────────────────────────────────────────────────────────

export interface Trajectory {
  avgDailyDeficit: number;
  projectedWeeklyLossLbs: number;
  estimatedGoalDate: string | null;
  weeksToGoal: number | null;
  // "stale" = there IS history, just none inside the recent window. Distinct from
  // "insufficient_data" (genuinely new), because telling a returning user with
  // months of history to "keep logging" reads as though their data was lost.
  status: "on_track" | "ahead" | "behind" | "insufficient_data" | "stale";
  currentWeightLbs: number | null; // latest logged weight across ALL history
  currentWeightDate: string | null;
  daysSinceLastLog: number | null; // null when nothing has ever been logged
}

/**
 * Most recent weight across the WHOLE history, not a rolling window.
 *
 * This distinction is the bug it was written to fix: trajectory used to read the
 * weight out of a 14-day window, so anyone returning after a gap fell back to
 * `profile.currentWeightLbs` — the number captured at onboarding — and the app
 * looked like it had forgotten months of progress.
 */
export function latestWeight(
  logs: DailyLogs
): { lbs: number; date: string } | null {
  let best: { lbs: number; date: string } | null = null;
  for (const [date, day] of Object.entries(logs)) {
    const lbs = day?.weightLbs;
    if (lbs == null) continue;
    if (!best || date > best.date) best = { lbs, date };
  }
  return best;
}

/** The most recent date with any food logged, across all history. */
export function lastLoggedDate(logs: DailyLogs): string | null {
  let best: string | null = null;
  for (const [date, day] of Object.entries(logs)) {
    if (!day?.entries?.length) continue;
    if (!best || date > best) best = date;
  }
  return best;
}

/** Whole days between a YYYY-MM-DD date and today, in local time. */
export function daysSince(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const then = new Date(y, m - 1, d);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((today.getTime() - then.getTime()) / 86_400_000);
}

export function computeTrajectory(
  logs: DailyLogs,
  profile: UserProfile
): Trajectory {
  const agg = aggregateLast(logs, 14);
  const loggedDays = agg.filter((d) => d.logged);

  // Weight comes from the whole history, never the 14-day window — see
  // latestWeight() for why.
  const weigh = latestWeight(logs);
  const currentWeightLbs = weigh?.lbs ?? null;
  const currentWeightDate = weigh?.date ?? null;

  const lastLog = lastLoggedDate(logs);
  const daysSinceLastLog = lastLog ? daysSince(lastLog) : null;

  if (loggedDays.length < 3) {
    return {
      avgDailyDeficit: 0,
      projectedWeeklyLossLbs: 0,
      estimatedGoalDate: null,
      weeksToGoal: null,
      // Having logged before but not lately is a different situation from never
      // having logged, and the UI says so.
      status: lastLog ? "stale" : "insufficient_data",
      currentWeightLbs,
      currentWeightDate,
      daysSinceLastLog,
    };
  }

  const avgCalories =
    loggedDays.reduce((s, d) => s + d.calories, 0) / loggedDays.length;
  const avgDailyDeficit = profile.dailyCalorieTarget - avgCalories;

  // 3,500 kcal ≈ 1 lb of fat
  const projectedWeeklyLossLbs = (avgDailyDeficit * 7) / 3500;

  const startWeight = currentWeightLbs ?? profile.currentWeightLbs;
  const lbsToGo = startWeight - profile.goalWeightLbs;

  let estimatedGoalDate: string | null = null;
  let weeksToGoal: number | null = null;

  if (projectedWeeklyLossLbs > 0 && lbsToGo > 0) {
    weeksToGoal = Math.ceil(lbsToGo / projectedWeeklyLossLbs);
    const goalDate = new Date();
    goalDate.setDate(goalDate.getDate() + weeksToGoal * 7);
    estimatedGoalDate = goalDate.toISOString().slice(0, 10);
  }

  // Target deficit = chosen dailyDeficit → tolerance ±15%
  const targetDeficit = profile.dailyDeficit ?? 500;
  let status: Trajectory["status"] = "on_track";
  if (avgDailyDeficit >= targetDeficit * 1.15) status = "ahead";
  else if (avgDailyDeficit < targetDeficit * 0.7) status = "behind";

  return {
    avgDailyDeficit: Math.round(avgDailyDeficit),
    projectedWeeklyLossLbs: Math.round(projectedWeeklyLossLbs * 10) / 10,
    estimatedGoalDate,
    weeksToGoal,
    status,
    currentWeightLbs,
    currentWeightDate,
    daysSinceLastLog,
  };
}

// ─── Calorie + protein targets ────────────────────────────────────────────────

export function calcTargets(
  sex: "male" | "female",
  weightLbs: number,
  heightIn: number,
  age: number,
  activityLevel: UserProfile["activityLevel"],
  dailyDeficit = 500
): { calories: number; protein: number; tdee: number } {
  // Convert to metric for Mifflin-St Jeor
  const weightKg = weightLbs * 0.453592;
  const heightCm = heightIn * 2.54;

  const bmr =
    sex === "male"
      ? 10 * weightKg + 6.25 * heightCm - 5 * age + 5
      : 10 * weightKg + 6.25 * heightCm - 5 * age - 161;

  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
  };

  const tdee = Math.round(bmr * activityMultipliers[activityLevel]);
  const calories = Math.round(tdee - dailyDeficit);

  // Protein: DRI-based, scaled by activity for muscle preservation during deficit
  // Baseline RDA is 0.8g/kg; we scale up modestly for weight loss to spare muscle
  const proteinPerKg = {
    sedentary: 1.0,  // just above RDA — minimal activity, focus on deficit
    light: 1.2,      // slightly elevated to offset muscle loss during deficit
    moderate: 1.4,   // more active, more muscle to preserve
    active: 1.6,     // active exercisers — upper range still below bodybuilder targets
  }[activityLevel];
  const protein = Math.round(weightKg * proteinPerKg);

  return { calories, protein, tdee };
}

export function predictGoalDate(
  currentWeightLbs: number,
  goalWeightLbs: number,
  weeklyLossLbs = 1
): string {
  const lbsToGo = currentWeightLbs - goalWeightLbs;
  const weeksNeeded = Math.ceil(lbsToGo / weeklyLossLbs);
  const date = new Date();
  date.setDate(date.getDate() + weeksNeeded * 7);
  return date.toISOString().slice(0, 10);
}

// ─── Milestones ───────────────────────────────────────────────────────────────

export function generateMilestones(
  currentWeightLbs: number,
  goalWeightLbs: number,
  weeklyLossLbs: number
): Milestone[] {
  const milestones: Milestone[] = [];

  // Weeks 1–4
  for (let w = 1; w <= 4; w++) {
    const target = Math.max(
      Math.round((currentWeightLbs - weeklyLossLbs * w) * 10) / 10,
      goalWeightLbs
    );
    const date = new Date();
    date.setDate(date.getDate() + w * 7);
    milestones.push({
      label: `Week ${w}`,
      date: date.toISOString().slice(0, 10),
      targetWeightLbs: target,
    });
    if (target <= goalWeightLbs) return milestones;
  }

  // Month 2, 3, 4... (every 4 weeks beyond the first month)
  let month = 2;
  while (month <= 36) {
    const weeksElapsed = 4 * month; // cumulative weeks from start
    const target = Math.max(
      Math.round((currentWeightLbs - weeklyLossLbs * weeksElapsed) * 10) / 10,
      goalWeightLbs
    );
    const date = new Date();
    date.setDate(date.getDate() + weeksElapsed * 7);
    milestones.push({
      label: `Month ${month}`,
      date: date.toISOString().slice(0, 10),
      targetWeightLbs: target,
    });
    if (target <= goalWeightLbs) break;
    month++;
  }

  return milestones;
}
