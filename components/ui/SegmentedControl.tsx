"use client";

import { cn } from "@/lib/cn";

/**
 * Replaces the inline meal-type picker, which was 4 plain buttons whose
 * selection was communicated by colour only, with no grouping semantics.
 */
export function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: T; label: string }>;
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="flex gap-1 rounded-2xl bg-surface-sunken p-1"
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={cn(
              "min-h-9 flex-1 rounded-xl px-2 text-sm font-semibold transition-colors",
              selected
                ? "bg-surface text-brand-800 shadow-card"
                : "text-ink-muted hover:text-ink"
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
