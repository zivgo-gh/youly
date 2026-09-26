import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";

/**
 * Icon-only button. `label` is required, not optional — the audit found several
 * icon-only controls (delete entry, disclosure toggle) with no accessible name
 * at all, so making it optional is how that bug comes back.
 */
export function IconButton({
  icon,
  label,
  onClick,
  disabled,
  tone = "neutral",
  size = 40,
  className,
  ...aria
}: {
  icon: IconName;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "neutral" | "brand" | "danger";
  size?: number;
  className?: string;
  "aria-expanded"?: boolean;
  "aria-controls"?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      {...aria}
      style={{ minWidth: size, minHeight: size }}
      className={cn(
        "inline-flex items-center justify-center rounded-full transition-colors",
        "disabled:pointer-events-none disabled:opacity-40",
        tone === "neutral" && "text-ink-muted hover:bg-surface-sunken hover:text-ink",
        tone === "brand" && "text-brand-700 hover:bg-brand-50",
        tone === "danger" && "text-danger hover:bg-danger-soft",
        className
      )}
    >
      <Icon name={icon} />
    </button>
  );
}
