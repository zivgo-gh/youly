"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  ReferenceLine,
} from "recharts";
import { getProfile, getAllLogs } from "@/lib/storage";
import { aggregateLast, computeTrajectory, weeklyStats, generateMilestones } from "@/lib/calories";
import type { UserProfile, DailyLogs, Milestone } from "@/lib/types";
import type { Trajectory } from "@/lib/calories";

export default function ProgressPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<DailyLogs>({});
  const [trajectory, setTrajectory] = useState<Trajectory | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p = getProfile();
    if (!p || !p.onboardingComplete) {
      router.replace("/onboarding");
      return;
    }
    const allLogs = getAllLogs();
    setProfile(p);
    setLogs(allLogs);
    setTrajectory(computeTrajectory(allLogs, p));
    const weeklyLossLbs = (p.dailyDeficit ?? 500) / 500;
    setMilestones(generateMilestones(p.currentWeightLbs, p.goalWeightLbs, weeklyLossLbs));
    setLoading(false);
  }, [router]);

  const agg30 = profile && logs ? aggregateLast(logs, 30) : [];
  const stats7 = profile && logs ? weeklyStats(logs, 7) : null;

  const calChartData = agg30.map((d) => ({
    date: d.date.slice(5), // MM-DD
    calories: d.logged ? d.calories : null,
    target: profile?.dailyCalorieTarget,
  }));

  const proteinChartData = agg30.map((d) => ({
    date: d.date.slice(5),
    protein: d.logged ? d.protein : null,
    target: profile?.dailyProteinTarget,
  }));

  const weightChartData = agg30
    .filter((d) => d.weightLbs !== null)
    .map((d) => ({ date: d.date.slice(5), weight: d.weightLbs }));

  const generateSummary = async () => {
    if (!profile) return;
    setSummaryLoading(true);
    try {
      const res = await fetch("/api/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, logs }),
      });
      const data = await res.json();
      setSummary(data.summary ?? "");
    } catch {
      setSummary("Failed to generate summary. Please try again.");
    } finally {
      setSummaryLoading(false);
    }
  };

  if (loading || !profile || !trajectory) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  const statusColors = {
    ahead: "text-emerald-600 bg-emerald-50",
    on_track: "text-blue-600 bg-blue-50",
    behind: "text-orange-500 bg-orange-50",
    insufficient_data: "text-gray-500 bg-gray-100",
  };

  const statusLabels = {
    ahead: "Ahead of pace",
    on_track: "On track",
    behind: "Behind pace",
    insufficient_data: "Keep logging",
  };

  const currentWeightLbs = trajectory.currentWeightLbs ?? profile.currentWeightLbs;
  const weeklyLossLbs = (profile.dailyDeficit ?? 500) / 500;

  // Find next milestone not yet reached
  const nextMilestone = milestones.find((m) => m.targetWeightLbs > (trajectory.currentWeightLbs ?? profile.goalWeightLbs + 1));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
        <a href="/chat" className="text-emerald-600 hover:underline text-sm">
          ← Back to chat
        </a>
        <span className="text-lg font-black tracking-tight uppercase text-emerald-600">Youly</span>
        <span className="text-gray-400 text-sm">Progress</span>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Goal tracker */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">
            Goal
          </h2>
          <div className="flex flex-wrap gap-6">
            <div>
              <p className="text-3xl font-bold text-gray-800">
                {currentWeightLbs}
                <span className="text-base font-normal text-gray-400"> lbs</span>
              </p>
              <p className="text-xs text-gray-400">Current weight</p>
            </div>
            <div className="text-2xl text-gray-300 self-center">→</div>
            <div>
              <p className="text-3xl font-bold text-emerald-600">
                {profile.goalWeightLbs}
                <span className="text-base font-normal text-gray-400"> lbs</span>
              </p>
              <p className="text-xs text-gray-400">Goal weight</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-3 items-center">
            <span
              className={`inline-block text-xs font-medium px-3 py-1 rounded-full ${
                statusColors[trajectory.status]
              }`}
            >
              {statusLabels[trajectory.status]}
            </span>

            {trajectory.estimatedGoalDate && (
              <span className="text-sm text-gray-600">
                Estimated goal:{" "}
                <strong>
                  {new Date(trajectory.estimatedGoalDate).toLocaleDateString(
                    "en-US",
                    { month: "long", day: "numeric", year: "numeric" }
                  )}
                </strong>
                {trajectory.weeksToGoal &&
                  ` (${trajectory.weeksToGoal} weeks)`}
              </span>
            )}
          </div>

          {trajectory.projectedWeeklyLossLbs > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              Projected loss: {trajectory.projectedWeeklyLossLbs} lbs/week based on last 14 days
            </p>
          )}
        </section>

        {/* Milestones */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">
            Your journey — {weeklyLossLbs} lb/week pace
          </h2>
          <div className="space-y-2">
            {milestones.map((m) => {
              const reached = currentWeightLbs <= m.targetWeightLbs;
              const isNext = nextMilestone?.label === m.label;
              return (
                <div
                  key={m.label}
                  className={`flex items-center justify-between py-2 px-3 rounded-xl text-sm ${
                    reached
                      ? "bg-emerald-50 text-emerald-700"
                      : isNext
                      ? "bg-blue-50 text-blue-700 font-medium"
                      : "text-gray-500"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    {reached ? "✓" : isNext ? "→" : "·"} {m.label}
                  </span>
                  <span>
                    {m.targetWeightLbs} lbs{" "}
                    <span className="text-xs opacity-60">
                      {new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </span>
                </div>
              );
            })}
          </div>
        </section>

        {/* This week */}
        {stats7 && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">
              This week
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  {stats7.avgCalories}
                </p>
                <p className="text-xs text-gray-400">
                  avg kcal/day (target {profile.dailyCalorieTarget})
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {stats7.avgProtein}g
                </p>
                <p className="text-xs text-gray-400">
                  avg protein/day (target {profile.dailyProteinTarget}g)
                </p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">
                  {stats7.daysLogged}/7
                </p>
                <p className="text-xs text-gray-400">days logged</p>
              </div>
            </div>
          </section>
        )}

        {/* Calorie chart */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">
            Calories — last 30 days
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={calChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickLine={false}
                interval={6}
              />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  border: "none",
                  borderRadius: 8,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              />
              <ReferenceLine
                y={profile.dailyCalorieTarget}
                stroke="#10b981"
                strokeDasharray="4 4"
                label={{ value: "target", position: "right", fontSize: 10, fill: "#10b981" }}
              />
              <Bar dataKey="calories" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        {/* Protein chart */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">
            Protein — last 30 days
          </h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={proteinChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#9ca3af" }}
                tickLine={false}
                interval={6}
              />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickLine={false} />
              <Tooltip
                contentStyle={{
                  fontSize: 12,
                  border: "none",
                  borderRadius: 8,
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                }}
              />
              <ReferenceLine
                y={profile.dailyProteinTarget}
                stroke="#3b82f6"
                strokeDasharray="4 4"
                label={{ value: "target", position: "right", fontSize: 10, fill: "#3b82f6" }}
              />
              <Bar dataKey="protein" fill="#3b82f6" radius={[4, 4, 0, 0]} opacity={0.8} />
            </BarChart>
          </ResponsiveContainer>
        </section>

        {/* Weight chart */}
        {weightChartData.length > 1 && (
          <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-4">
              Weight trend
            </h2>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={weightChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickLine={false}
                  domain={["auto", "auto"]}
                />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    border: "none",
                    borderRadius: 8,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                  }}
                  formatter={(v) => [`${v} lbs`, "Weight"]}
                />
                <ReferenceLine
                  y={profile.goalWeightLbs}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  label={{ value: "goal", position: "right", fontSize: 10, fill: "#10b981" }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="#6366f1"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#6366f1" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </section>
        )}

        {/* Weekly summary */}
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400">
              Weekly summary
            </h2>
            <button
              onClick={generateSummary}
              disabled={summaryLoading}
              className="text-xs text-emerald-600 hover:underline disabled:opacity-50"
            >
              {summaryLoading ? "Generating..." : "Generate"}
            </button>
          </div>
          {summary ? (
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
              {summary}
            </p>
          ) : (
            <p className="text-sm text-gray-400">
              Click &quot;Generate&quot; for an AI-written summary of your week.
            </p>
          )}
        </section>

        {/* Reset */}
        <div className="pb-4 text-center">
          <button
            onClick={() => {
              if (confirm("This will erase all your data and restart onboarding. Are you sure?")) {
                localStorage.clear();
                window.location.replace("/onboarding");
              }
            }}
            className="text-xs text-gray-300 hover:text-red-400 transition-colors"
          >
            Reset app & start over
          </button>
        </div>
      </div>
    </div>
  );
}
