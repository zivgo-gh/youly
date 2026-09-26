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
import { loadLogs } from "@/lib/db";
import { resolveProfile } from "@/lib/resolve-profile";
import { LoadFailure } from "@/components/shared/LoadFailure";
import {
  aggregateLast,
  computeTrajectory,
  weeklyStats,
  generateMilestones,
} from "@/lib/calories";
import type { UserProfile, DailyLogs, Milestone } from "@/lib/types";
import type { Trajectory } from "@/lib/calories";
import { CHART, AXIS_TICK, TOOLTIP_STYLE } from "@/lib/chart-theme";
import { Container } from "@/components/ui/Container";
import { Card, CardLabel } from "@/components/ui/Card";
import { Stat } from "@/components/ui/Metric";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { LoadingScreen, Badge } from "@/components/ui/Feedback";

const STATUS: Record<
  Trajectory["status"],
  { label: string; tone: "brand" | "neutral" | "warn" }
> = {
  ahead: { label: "Ahead of pace", tone: "brand" },
  on_track: { label: "On track", tone: "brand" },
  behind: { label: "Behind pace", tone: "warn" },
  insufficient_data: { label: "Keep logging", tone: "neutral" },
};

function ChartFrame({
  title,
  summary,
  children,
}: {
  title: string;
  summary: string;
  children: React.ReactNode;
}) {
  return (
    <Card as="section">
      <CardLabel>{title}</CardLabel>
      {/* A chart is invisible to a screen reader. This sentence is the
          equivalent text; full data tables land in the accessibility pass. */}
      <p className="sr-only">{summary}</p>
      <div className="mt-4 h-48 w-full sm:h-56">
        <ResponsiveContainer width="100%" height="100%">
          {children as React.ReactElement}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

export default function ProgressPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [logs, setLogs] = useState<DailyLogs>({});
  const [trajectory, setTrajectory] = useState<Trajectory | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [summary, setSummary] = useState<string>("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    async function init() {
      const r = await resolveProfile();
      if (r.status === "error") {
        setFailed(true);
        return;
      }
      if (r.status === "signed-out") {
        router.replace("/login?next=/app/progress");
        return;
      }
      if (r.status === "needs-onboarding") {
        router.replace("/app/onboarding");
        return;
      }
      const p = r.profile;
      const allLogs = await loadLogs(r.uid);
      setProfile(p);
      setLogs(allLogs);
      setTrajectory(computeTrajectory(allLogs, p));
      const weeklyLossLbs = (p.dailyDeficit ?? 500) / 500;
      setMilestones(
        generateMilestones(p.currentWeightLbs, p.goalWeightLbs, weeklyLossLbs)
      );
      setLoading(false);
    }
    init();
  }, [router]);

  const agg30 = profile && logs ? aggregateLast(logs, 30) : [];
  const stats7 = profile && logs ? weeklyStats(logs, 7) : null;

  const calChartData = agg30.map((d) => ({
    date: d.date.slice(5),
    calories: d.logged ? d.calories : null,
  }));

  const proteinChartData = agg30.map((d) => ({
    date: d.date.slice(5),
    protein: d.logged ? d.protein : null,
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
      if (!res.ok) {
        setSummary(
          res.status === 401
            ? "Your session expired. Please sign in again."
            : "We couldn't generate a summary just now. Please try again."
        );
        return;
      }
      const data = await res.json();
      setSummary(data.summary ?? "");
    } catch {
      setSummary("We couldn't generate a summary just now. Please try again.");
    } finally {
      setSummaryLoading(false);
    }
  };

  if (failed) return <LoadFailure />;
  if (loading || !profile || !trajectory)
    return <LoadingScreen label="Loading your progress" />;

  const currentWeightLbs =
    trajectory.currentWeightLbs ?? profile.currentWeightLbs;
  const weeklyLossLbs = (profile.dailyDeficit ?? 500) / 500;
  const status = STATUS[trajectory.status];

  const nextMilestone = milestones.find(
    (m) =>
      m.targetWeightLbs >
      (trajectory.currentWeightLbs ?? profile.goalWeightLbs + 1)
  );

  return (
    <div className="bg-surface-sunken py-8 sm:py-12">
      <Container>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Progress</h1>
        <p className="mt-1 text-sm text-ink-muted">
          Your last 30 days, and where the current pace lands you.
        </p>

        <div className="mt-6 space-y-6">
          {/* Goal */}
          <Card as="section">
            <CardLabel>Goal</CardLabel>
            <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-4">
              <Stat label="Current weight" value={currentWeightLbs} unit="lbs" />
              <Icon
                name="chevron-right"
                className="hidden text-ink-muted sm:block"
                size={22}
              />
              <Stat
                label="Goal weight"
                value={profile.goalWeightLbs}
                unit="lbs"
                tone="brand"
              />
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Badge tone={status.tone}>{status.label}</Badge>
              {trajectory.estimatedGoalDate ? (
                <span className="text-sm text-ink-body">
                  Estimated goal:{" "}
                  <strong className="font-semibold text-ink">
                    {new Date(trajectory.estimatedGoalDate).toLocaleDateString(
                      "en-US",
                      { month: "long", day: "numeric", year: "numeric" }
                    )}
                  </strong>
                  {trajectory.weeksToGoal
                    ? ` (${trajectory.weeksToGoal} weeks)`
                    : null}
                </span>
              ) : null}
            </div>

            {trajectory.projectedWeeklyLossLbs > 0 ? (
              <p className="tnum mt-2 text-sm text-ink-muted">
                Projected loss: {trajectory.projectedWeeklyLossLbs} lbs/week, based
                on the last 14 days.
              </p>
            ) : null}
          </Card>

          {/* Milestones */}
          <Card as="section">
            <CardLabel>Your journey — {weeklyLossLbs} lb/week pace</CardLabel>
            <ul className="mt-4 space-y-1">
              {milestones.map((m) => {
                const reached = currentWeightLbs <= m.targetWeightLbs;
                const isNext = nextMilestone?.label === m.label;
                return (
                  <li
                    key={m.label}
                    className={
                      reached
                        ? "flex items-center justify-between gap-3 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800"
                        : isNext
                          ? "flex items-center justify-between gap-3 rounded-xl bg-surface-sunken px-3 py-2 text-sm font-semibold text-ink"
                          : "flex items-center justify-between gap-3 px-3 py-2 text-sm text-ink-muted"
                    }
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {reached ? (
                        <Icon name="check" size={16} className="text-brand-700" />
                      ) : isNext ? (
                        <Icon name="target" size={16} />
                      ) : (
                        <span aria-hidden="true" className="w-4" />
                      )}
                      <span className="truncate">{m.label}</span>
                      {/* State in words, not glyph-and-colour alone. */}
                      <span className="sr-only">
                        {reached ? "(reached)" : isNext ? "(next up)" : "(upcoming)"}
                      </span>
                    </span>
                    <span className="tnum shrink-0">
                      {m.targetWeightLbs} lbs{" "}
                      <span className="text-xs opacity-70">
                        {new Date(m.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* This week */}
          {stats7 ? (
            <Card as="section">
              <CardLabel>This week</CardLabel>
              <div className="mt-4 grid grid-cols-2 gap-5 sm:grid-cols-3">
                <Stat
                  label={`Avg kcal/day · target ${profile.dailyCalorieTarget}`}
                  value={stats7.avgCalories}
                />
                <Stat
                  label={`Avg protein/day · target ${profile.dailyProteinTarget}g`}
                  value={`${stats7.avgProtein}g`}
                />
                <Stat label="Days logged" value={`${stats7.daysLogged}/7`} />
              </div>
            </Card>
          ) : null}

          <ChartFrame
            title="Calories — last 30 days"
            summary={`Daily calories over the last 30 days against a target of ${profile.dailyCalorieTarget} kcal. This week averaged ${stats7?.avgCalories ?? 0} kcal per day.`}
          >
            <BarChart
              data={calChartData}
              margin={{ top: 4, right: 8, left: -18, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} interval={6} />
              <YAxis tick={AXIS_TICK} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <ReferenceLine
                y={profile.dailyCalorieTarget}
                stroke={CHART.goal}
                strokeDasharray="4 4"
                label={{
                  value: "target",
                  position: "right",
                  fontSize: 11,
                  fill: CHART.goal,
                }}
              />
              <Bar dataKey="calories" fill={CHART.calories} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartFrame>

          <ChartFrame
            title="Protein — last 30 days"
            summary={`Daily protein over the last 30 days against a target of ${profile.dailyProteinTarget} grams. This week averaged ${stats7?.avgProtein ?? 0} grams per day.`}
          >
            <BarChart
              data={proteinChartData}
              margin={{ top: 4, right: 8, left: -18, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} interval={6} />
              <YAxis tick={AXIS_TICK} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <ReferenceLine
                y={profile.dailyProteinTarget}
                stroke={CHART.protein}
                strokeDasharray="4 4"
                label={{
                  value: "target",
                  position: "right",
                  fontSize: 11,
                  fill: CHART.protein,
                }}
              />
              <Bar dataKey="protein" fill={CHART.protein} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartFrame>

          {weightChartData.length > 1 ? (
            <ChartFrame
              title="Weight trend"
              summary={`Weight readings over the last 30 days, currently ${currentWeightLbs} lbs against a goal of ${profile.goalWeightLbs} lbs.`}
            >
              <LineChart
                data={weightChartData}
                margin={{ top: 4, right: 8, left: -18, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="date" tick={AXIS_TICK} tickLine={false} />
                <YAxis tick={AXIS_TICK} tickLine={false} domain={["auto", "auto"]} />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  formatter={(v) => [`${v} lbs`, "Weight"]}
                />
                <ReferenceLine
                  y={profile.goalWeightLbs}
                  stroke={CHART.goal}
                  strokeDasharray="4 4"
                  label={{
                    value: "goal",
                    position: "right",
                    fontSize: 11,
                    fill: CHART.goal,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke={CHART.weight}
                  strokeWidth={2}
                  dot={{ r: 3, fill: CHART.weight }}
                />
              </LineChart>
            </ChartFrame>
          ) : null}

          {/* Weekly summary */}
          <Card as="section">
            <div className="flex items-center justify-between gap-3">
              <CardLabel>Weekly summary</CardLabel>
              <Button
                variant="ghost"
                size="sm"
                loading={summaryLoading}
                onClick={generateSummary}
              >
                {summary ? "Regenerate" : "Generate"}
              </Button>
            </div>
            <div aria-live="polite" className="mt-3">
              {summary ? (
                <p className="text-sm leading-relaxed whitespace-pre-wrap text-ink-body">
                  {summary}
                </p>
              ) : (
                <p className="text-sm text-ink-muted">
                  Generate an AI-written recap of your week — what went well, and
                  one thing to focus on next.
                </p>
              )}
            </div>
          </Card>
        </div>
      </Container>
    </div>
  );
}
