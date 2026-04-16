"use client";

interface Props {
  label: string;
  current: number;
  target: number;
  unit: string;
  color: string; // tailwind color class e.g. "emerald"
}

export function MacroRing({ label, current, target, unit, color }: Props) {
  const pct = Math.min(current / Math.max(target, 1), 1);
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dash = pct * circumference;
  const isOver = current > target;

  const colorMap: Record<string, { stroke: string; text: string }> = {
    emerald: { stroke: "#10b981", text: "text-emerald-600" },
    blue: { stroke: "#3b82f6", text: "text-blue-600" },
    orange: { stroke: "#f97316", text: "text-orange-500" },
  };
  const c = colorMap[color] ?? colorMap.emerald;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <svg className="w-16 h-16 -rotate-90" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="6" />
          <circle
            cx="36"
            cy="36"
            r={radius}
            fill="none"
            stroke={isOver ? "#ef4444" : c.stroke}
            strokeWidth="6"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`text-xs font-bold ${isOver ? "text-red-500" : c.text}`}>
            {Math.round(pct * 100)}%
          </span>
        </div>
      </div>
      <div className="text-center">
        <div className={`text-sm font-semibold ${isOver ? "text-red-500" : "text-gray-800"}`}>
          {current}
          <span className="text-xs text-gray-400">/{target}{unit}</span>
        </div>
        <div className="text-xs text-gray-500">{label}</div>
      </div>
    </div>
  );
}
