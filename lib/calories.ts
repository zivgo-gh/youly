import type { DailyLogs, UserProfile } from "./types";

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function dateRange(days: number): string[] {
  const result: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    result.push(d.toISOString().slice(0, 10));
  }
  return result;
}

// ─── Aggregates ───────────────────────────────────────────────────────────────

export interface DayAggregate {
  date: string;
  calories: number;
  protein: number;
  weightKg: number | null;
  logged: boolean; // whether the user logged anything that day
}

export function aggregateLast(logs: DailyLogs, days: number): DayAggregate[] {
  return dateRange(days).map((date) => {
    const day = logs[date];
    return {
      date,
      calories: day?.totalCalories ?? 0,
      protein: day?.totalProtein ?? 0,
      weightKg: day?.weightKg ?? null,
      logged: (day?.entries?.length ?? 0) > 0,
    };
  });
}

export interface WeeklyStats {
  avgCalories: number;
  avgProtein: number;
  daysLogged: number;
  totalDays: number;
  weights: { date: string; kg: number }[];
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
    .filter((d) => d.weightKg !== null)
    .map((d) => ({ date: d.date, kg: d.weightKg as number }));
  return { avgCalories, avgProtein, daysLogged: logged.length, totalDays: days, weights };
}

// ─── Trajectory ───────────────────────────────────────────────────────────────

export interface Trajectory {
  avgDailyDeficit: number; // calories/day below target
  projectedWeeklyLossKg: number;
  estimatedGoalDate: string | null;
  weeksToGoal: number | null;
  status: "on_track" | "ahead" | "behind" | "insufficient_data";
  currentWeightKg: number | null; // latest logged weight
}

export function computeTrajectory(
  logs: DailyLogs,
  profile: UserProfile
): Trajectory {
  const agg = aggregateLast(logs, 14);
  const loggedDays = agg.filter((d) => d.logged);

  // Get latest logged weight
  const weightEntries = agg
    .filter((d) => d.weightKg !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
  const currentWeightKg =
    weightEntries.length > 0 ? weightEntries[0].weightKg : null;

  if (loggedDays.length < 3) {
    return {
      avgDailyDeficit: 0,
      projectedWeeklyLossKg: 0,
      estimatedGoalDate: null,
      weeksToGoal: null,
      status: "insufficient_data",
      currentWeightKg,
    };
  }

  const avgCalories =
    loggedDays.reduce((s, d) => s + d.calories, 0) / loggedDays.length;
  const avgDailyDeficit = profile.dailyCalorieTarget - avgCalories;

  // 7,700 kcal ≈ 1kg of fat
  const projectedWeeklyLossKg = (avgDailyDeficit * 7) / 7700;

  const startWeight = currentWeightKg ?? profile.currentWeightKg;
  const kgToGo = startWeight - profile.goalWeightKg;

  let estimatedGoalDate: string | null = null;
  let weeksToGoal: number | null = null;

  if (projectedWeeklyLossKg > 0 && kgToGo > 0) {
    weeksToGoal = Math.ceil(kgToGo / projectedWeeklyLossKg);
    const goalDate = new Date();
    goalDate.setDate(goalDate.getDate() + weeksToGoal * 7);
    estimatedGoalDate = goalDate.toISOString().slice(0, 10);
  }

  // Target deficit = 500 cal/day → 0.45 kg/week
  const targetDeficit = 500;
  let status: Trajectory["status"] = "on_track";
  if (avgDailyDeficit >= targetDeficit * 1.15) status = "ahead";
  else if (avgDailyDeficit < targetDeficit * 0.7) status = "behind";

  return {
    avgDailyDeficit: Math.round(avgDailyDeficit),
    projectedWeeklyLossKg: Math.round(projectedWeeklyLossKg * 10) / 10,
    estimatedGoalDate,
    weeksToGoal,
    status,
    currentWeightKg,
  };
}

// ─── Calorie target from profile ──────────────────────────────────────────────

export function calcTargets(
  sex: "male" | "female",
  weightKg: number,
  heightCm: number,
  age: number,
  activityLevel: UserProfile["activityLevel"]
): { calories: number; protein: number } {
  // Mifflin-St Jeor BMR
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

  const tdee = bmr * activityMultipliers[activityLevel];
  const calories = Math.round(tdee - 500); // 500 cal deficit
  const protein = Math.round(weightKg * 2); // 2g per kg bodyweight

  return { calories, protein };
}

export function predictGoalDate(
  currentWeightKg: number,
  goalWeightKg: number
): string {
  const kgToGo = currentWeightKg - goalWeightKg;
  // Assume 0.5kg/week on a 500 cal deficit
  const weeksNeeded = Math.ceil(kgToGo / 0.5);
  const date = new Date();
  date.setDate(date.getDate() + weeksNeeded * 7);
  return date.toISOString().slice(0, 10);
}
