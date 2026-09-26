import { cn } from "@/lib/cn";

/**
 * Macro/calorie progress against a target — effectively a bullet chart.
 * Replaces 3 duplicated bar implementations, and fixes the fact that going over
 * target was signalled by colour alone (emerald -> orange). The state is now
 * also stated in text, and the bar carries proper progressbar semantics.
 */
export function ProgressBar({
  label,
  value,
  target,
  unit,
  series = "calories",
}: {
  label: string;
  value: number;
  target: number;
  unit: string;
  series?: "calories" | "protein";
}) {
  const over = target > 0 && value > target;
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  const remaining = Math.max(0, target - value);

  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
          {label}
        </span>
        <span className="tnum text-sm text-ink-body">
          <span className="font-semibold text-ink">{value.toLocaleString()}</span>
          <span className="text-ink-muted"> / {target.toLocaleString()} {unit}</span>
        </span>
      </div>

      <div
        role="progressbar"
        aria-label={`${label}: ${value} of ${target} ${unit}`}
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={target}
        className="mt-2 h-2 w-full overflow-hidden rounded-full bg-border-subtle"
      >
        <div
          className={cn(
            "h-full rounded-full transition-[width] duration-300",
            over
              ? "bg-data-over"
              : series === "protein"
                ? "bg-data-protein"
                : "bg-data-calories"
          )}
          style={{ width: `${Math.max(pct, value > 0 ? 3 : 0)}%` }}
        />
      </div>

      {/* The text half of the signal — never colour alone. */}
      <p className="tnum mt-1.5 text-xs text-ink-muted">
        {over
          ? `${(value - target).toLocaleString()} ${unit} over target`
          : `${remaining.toLocaleString()} ${unit} left`}
      </p>
    </div>
  );
}

/** A single headline number with its caption. */
export function Stat({
  label,
  value,
  unit,
  tone = "default",
}: {
  label: string;
  value: string | number;
  unit?: string;
  tone?: "default" | "brand";
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
        {label}
      </p>
      <p
        className={cn(
          "tnum mt-1 text-2xl font-bold tracking-tight",
          tone === "brand" ? "text-brand-700" : "text-ink"
        )}
      >
        {value}
        {unit ? (
          <span className="ml-1 text-base font-medium text-ink-muted">{unit}</span>
        ) : null}
      </p>
    </div>
  );
}
