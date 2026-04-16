"use client";

import type { DayLog, UserProfile } from "@/lib/types";
import type { Trajectory } from "@/lib/calories";

interface Props {
  profile: UserProfile;
  todayLog: DayLog;
  trajectory: Trajectory;
}

function statusConfig(status: Trajectory["status"]) {
  switch (status) {
    case "ahead":    return { label: "Ahead of pace", dot: "bg-emerald-400", text: "text-emerald-700" };
    case "on_track": return { label: "On track", dot: "bg-blue-400", text: "text-blue-700" };
    case "behind":   return { label: "Behind pace", dot: "bg-orange-400", text: "text-orange-600" };
    default:         return { label: "Keep logging", dot: "bg-gray-300", text: "text-gray-500" };
  }
}

function MacroBar({
  label,
  current,
  target,
  unit,
  color,
}: {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: "emerald" | "blue";
}) {
  const pct = Math.min(current / target, 1);
  const over = current > target;
  const colorMap = {
    emerald: { bar: over ? "bg-orange-400" : "bg-emerald-500", text: "text-emerald-600", bg: "bg-emerald-50" },
    blue: { bar: over ? "bg-orange-400" : "bg-blue-500", text: "text-blue-600", bg: "bg-blue-50" },
  };
  const c = colorMap[color];

  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-baseline">
        <span className="text-xs font-semibold uppercase tracking-widest text-gray-400">{label}</span>
        <span className={`text-xs font-medium ${over ? "text-orange-500" : "text-gray-400"}`}>
          {target} {unit} goal
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span
          className="font-bold text-gray-800 leading-none tabular-nums"
          style={{ fontFamily: "var(--font-dm-sans)", fontSize: "2rem" }}
        >
          {current}
        </span>
        <span className="text-sm text-gray-400 font-medium">{unit}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${c.bar}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      <p className="text-xs text-gray-400">
        {over
          ? `${current - target} ${unit} over`
          : `${target - current} ${unit} left`}
      </p>
    </div>
  );
}

export function MacroSidebar({ profile, todayLog, trajectory }: Props) {
  const sc = statusConfig(trajectory.status);

  const today = new Date();
  const dateLabel = today.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="flex flex-col gap-6 p-5">
      {/* Date + Today header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-0.5">Today</p>
        <p className="text-base font-semibold text-gray-800" style={{ fontFamily: "var(--font-dm-sans)" }}>
          {dateLabel}
        </p>
      </div>

      {/* Calorie bar */}
      <MacroBar
        label="Calories"
        current={todayLog.totalCalories}
        target={profile.dailyCalorieTarget}
        unit="kcal"
        color="emerald"
      />

      {/* Protein bar */}
      <MacroBar
        label="Protein"
        current={todayLog.totalProtein}
        target={profile.dailyProteinTarget}
        unit="g"
        color="blue"
      />

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Trajectory */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Trajectory</p>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${sc.dot}`} />
          <span className={`text-sm font-semibold ${sc.text}`}>{sc.label}</span>
        </div>
        {trajectory.estimatedGoalDate && (
          <p className="text-xs text-gray-500 leading-relaxed">
            Goal by{" "}
            <span className="font-semibold text-gray-700">
              {new Date(trajectory.estimatedGoalDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            {trajectory.weeksToGoal && (
              <span className="text-gray-400"> · {trajectory.weeksToGoal} weeks</span>
            )}
          </p>
        )}
        {trajectory.status === "insufficient_data" && (
          <p className="text-xs text-gray-400">Log 3+ days to unlock trajectory</p>
        )}
      </div>

      {/* Today's food log */}
      {todayLog.entries.length > 0 && (
        <>
          <div className="border-t border-gray-100" />
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">Logged today</p>
            <ul className="space-y-2">
              {todayLog.entries.map((entry) => (
                <li key={entry.id} className="flex justify-between gap-2 text-xs text-gray-600">
                  <span className="truncate">{entry.description}</span>
                  <span className="shrink-0 text-gray-400 tabular-nums">{entry.estimatedCalories} kcal</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
