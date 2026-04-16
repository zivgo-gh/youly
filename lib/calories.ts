import type { DailyLogs, UserProfile, Milestone } from "./types";

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
  weightLbs: number | null;
  logged: boolean; // whether the user logged anything that day
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
  status: "on_track" | "ahead" | "behind" | "insufficient_data";
  currentWeightLbs: number | null; // latest logged weight
}

export function computeTrajectory(
  logs: DailyLogs,
  profile: UserProfile
): Trajectory {
  const agg = aggregateLast(logs, 14);
  const loggedDays = agg.filter((d) => d.logged);

  // Get latest logged weight
  const weightEntries = agg
    .filter((d) => d.weightLbs !== null)
    .sort((a, b) => b.date.localeCompare(a.date));
  const currentWeightLbs =
    weightEntries.length > 0 ? weightEntries[0].weightLbs : null;

  if (loggedDays.length < 3) {
    return {
      avgDailyDeficit: 0,
      projectedWeeklyLossLbs: 0,
      estimatedGoalDate: null,
      weeksToGoal: null,
      status: "insufficient_data",
      currentWeightLbs,
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
  // ~0.8g protein per lb of bodyweight (≈1.76g/kg) — optimal for muscle preservation
  const protein = Math.round(weightLbs * 0.8);

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
