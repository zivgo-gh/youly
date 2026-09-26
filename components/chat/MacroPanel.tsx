"use client";

import type { DayLog, UserProfile } from "@/lib/types";
import type { Trajectory } from "@/lib/calories";
import { ProgressBar } from "@/components/ui/Metric";
import { Badge } from "@/components/ui/Feedback";
import { CardLabel } from "@/components/ui/Card";

/**
 * Today's macros, trajectory, and food log.
 *
 * Replaces MacroSidebar. Its private MacroBar wasn't exported, so the mobile
 * macro strip in ChatInterface reimplemented the same bar a second time — both
 * copies signalled "over target" with colour alone. Both now use the shared
 * ProgressBar, which states it in text too.
 */
const STATUS: Record<
  Trajectory["status"],
  { label: string; tone: "brand" | "neutral" | "warn" }
> = {
  ahead: { label: "Ahead of pace", tone: "brand" },
  on_track: { label: "On track", tone: "brand" },
  behind: { label: "Behind pace", tone: "warn" },
  insufficient_data: { label: "Keep logging", tone: "neutral" },
};

export function MacroPanel({
  profile,
  todayLog,
  trajectory,
}: {
  profile: UserProfile;
  todayLog: DayLog;
  trajectory: Trajectory;
}) {
  const status = STATUS[trajectory.status];
  const dateLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-6 p-5">
      <div>
        <CardLabel>Today</CardLabel>
        <p className="mt-0.5 text-base font-semibold text-ink">{dateLabel}</p>
      </div>

      <ProgressBar
        label="Calories"
        value={todayLog.totalCalories}
        target={profile.dailyCalorieTarget}
        unit="kcal"
        series="calories"
      />
      <ProgressBar
        label="Protein"
        value={todayLog.totalProtein}
        target={profile.dailyProteinTarget}
        unit="g"
        series="protein"
      />

      <div className="border-t border-border-subtle" />

      <div className="space-y-2">
        <CardLabel>Trajectory</CardLabel>
        <Badge tone={status.tone}>{status.label}</Badge>
        {trajectory.estimatedGoalDate ? (
          <p className="text-sm leading-relaxed text-ink-muted">
            Goal by{" "}
            <span className="font-semibold text-ink-body">
              {new Date(trajectory.estimatedGoalDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            {trajectory.weeksToGoal ? (
              <span className="tnum"> · {trajectory.weeksToGoal} weeks</span>
            ) : null}
          </p>
        ) : null}
        {trajectory.status === "insufficient_data" ? (
          <p className="text-sm text-ink-muted">
            Log 3 or more days to unlock your trajectory.
          </p>
        ) : null}
      </div>

      {todayLog.entries.length > 0 ? (
        <>
          <div className="border-t border-border-subtle" />
          <div className="space-y-2">
            <CardLabel>Logged today</CardLabel>
            <ul className="space-y-2">
              {todayLog.entries.map((entry) => (
                <li
                  key={entry.id}
                  className="flex justify-between gap-2 text-sm text-ink-body"
                >
                  <span className="truncate">{entry.description}</span>
                  <span className="tnum shrink-0 text-ink-muted">
                    {entry.estimatedCalories} kcal
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
