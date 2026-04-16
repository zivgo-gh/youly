"use client";

import { MacroRing } from "@/components/shared/MacroRing";
import type { DayLog, UserProfile } from "@/lib/types";
import type { Trajectory } from "@/lib/calories";

interface Props {
  profile: UserProfile;
  todayLog: DayLog;
  trajectory: Trajectory;
}

function statusLabel(status: Trajectory["status"]) {
  switch (status) {
    case "ahead": return { text: "Ahead of pace", color: "text-emerald-600 bg-emerald-50" };
    case "on_track": return { text: "On track", color: "text-blue-600 bg-blue-50" };
    case "behind": return { text: "Behind pace", color: "text-orange-500 bg-orange-50" };
    default: return { text: "Keep logging", color: "text-gray-500 bg-gray-100" };
  }
}

export function MacroSidebar({ profile, todayLog, trajectory }: Props) {
  const remaining = Math.max(profile.dailyCalorieTarget - todayLog.totalCalories, 0);
  const { text, color } = statusLabel(trajectory.status);

  return (
    <div className="flex flex-col gap-5 p-4">
      {/* Today header */}
      <div>
        <h2 className="text-sm font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Today
        </h2>
        <div className="flex justify-around">
          <MacroRing
            label="Calories"
            current={todayLog.totalCalories}
            target={profile.dailyCalorieTarget}
            unit="kcal"
            color="emerald"
          />
          <MacroRing
            label="Protein"
            current={todayLog.totalProtein}
            target={profile.dailyProteinTarget}
            unit="g"
            color="blue"
          />
        </div>
        <p className="text-center text-xs text-gray-500 mt-2">
          {remaining > 0
            ? `${remaining} kcal remaining`
            : `${todayLog.totalCalories - profile.dailyCalorieTarget} kcal over target`}
        </p>
      </div>

      {/* Divider */}
      <div className="border-t border-gray-100" />

      {/* Trajectory */}
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
          Trajectory
        </h2>
        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
          {text}
        </span>
        {trajectory.estimatedGoalDate && (
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            At current pace, goal by{" "}
            <span className="font-semibold text-gray-700">
              {new Date(trajectory.estimatedGoalDate).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            {trajectory.weeksToGoal && ` (~${trajectory.weeksToGoal} weeks)`}
          </p>
        )}
        {trajectory.status === "insufficient_data" && (
          <p className="text-xs text-gray-400 mt-2">Log 3+ days to see your trajectory</p>
        )}
      </div>

      {/* Today's food log */}
      {todayLog.entries.length > 0 && (
        <>
          <div className="border-t border-gray-100" />
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-2">
              Logged today
            </h2>
            <ul className="space-y-1.5">
              {todayLog.entries.map((entry) => (
                <li key={entry.id} className="text-xs text-gray-600 flex justify-between gap-2">
                  <span className="truncate">{entry.description}</span>
                  <span className="shrink-0 text-gray-400">
                    {entry.estimatedCalories}kcal
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
