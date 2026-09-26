import { NextResponse } from "next/server";
import { anthropic } from "@/lib/ai";
import { requireApiUser } from "@/lib/auth-server";
import { loadProfileFrom, loadLogsFrom } from "@/lib/db-core";
import { weeklyStats, computeTrajectory, dateRange } from "@/lib/calories";

export const runtime = "nodejs";

export async function POST() {
  // This was an entirely open Anthropic proxy that also built its summary from
  // whatever profile and logs the caller posted.
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { supabase, uid } = auth;

  // Read under RLS. Besides closing the hole, this fixes a correctness bug: a
  // stale localStorage cache produced a weekly summary describing out-of-date logs.
  let profile;
  let logs;
  try {
    [profile, logs] = await Promise.all([
      loadProfileFrom(supabase, uid),
      loadLogsFrom(supabase, uid),
    ]);
  } catch {
    return NextResponse.json({ error: "could not load your data" }, { status: 503 });
  }

  if (!profile) {
    return NextResponse.json({ error: "needs-onboarding" }, { status: 409 });
  }

  const stats = weeklyStats(logs, 7);
  const trajectory = computeTrajectory(logs, profile);
  const days = dateRange(7);

  const dayDetails = days
    .map((date) => {
      const day = logs[date];
      if (!day || day.entries.length === 0) return `${date}: no log`;
      const foods = day.entries.map((e) => e.description).join(", ");
      return `${date}: ${day.totalCalories}kcal, ${day.totalProtein}g protein — ${foods}`;
    })
    .join("\n");

  const prompt = `Generate a weekly summary for ${profile.name}'s weight loss journey. Be warm, specific, and actionable.

USER PROFILE:
- Goal: ${profile.currentWeightLbs} lbs → ${profile.goalWeightLbs} lbs
- Daily targets: ${profile.dailyCalorieTarget}kcal, ${profile.dailyProteinTarget}g protein
- Predicted goal date: ${profile.predictedGoalDate}

THIS WEEK'S DATA:
- Days logged: ${stats.daysLogged}/7
- Avg calories: ${stats.avgCalories}kcal (target: ${profile.dailyCalorieTarget})
- Avg protein: ${stats.avgProtein}g (target: ${profile.dailyProteinTarget}g)
- Trajectory: ${trajectory.status}, projected weekly loss: ${trajectory.projectedWeeklyLossLbs} lbs/week
- Estimated goal date at current pace: ${trajectory.estimatedGoalDate ?? "insufficient data"}

DAILY BREAKDOWN:
${dayDetails}

Write a 3-4 paragraph summary covering:
1. Overall week performance (honest but encouraging)
2. Protein and calorie highlights
3. Specific patterns or foods to watch
4. One clear focus for next week

Keep it conversational and personal, like a real coach talking to them.`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    return NextResponse.json({ summary: text });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
