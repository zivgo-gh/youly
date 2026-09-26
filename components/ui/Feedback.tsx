import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./Icon";
import { Spinner } from "./Button";

/** Replaces 4 byte-identical full-page "Loading..." blocks. */
export function LoadingScreen({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-canvas">
      {/* Announced politely so a screen reader knows a wait is in progress. */}
      <p
        role="status"
        aria-live="polite"
        className="flex items-center gap-3 text-sm text-ink-muted"
      >
        <Spinner className="text-brand-600" />
        {label}…
      </p>
    </div>
  );
}

export function EmptyState({
  icon = "sparkles",
  title,
  body,
  action,
}: {
  icon?: IconName;
  title: string;
  body?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-12 text-center">
      <span className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
        <Icon name={icon} size={24} />
      </span>
      <p className="mt-4 text-base font-semibold text-ink">{title}</p>
      {body ? <p className="mt-1 max-w-sm text-sm text-ink-muted">{body}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function Badge({
  tone = "neutral",
  className,
  children,
}: {
  tone?: "neutral" | "brand" | "warn" | "danger";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tone === "neutral" && "bg-canvas text-ink-muted",
        tone === "brand" && "bg-brand-50 text-brand-800",
        tone === "warn" && "bg-amber-50 text-amber-800",
        tone === "danger" && "bg-danger-soft text-danger",
        className
      )}
    >
      {children}
    </span>
  );
}

/** Three bouncing dots. Replaces 3 copies. */
export function TypingDots({ label = "Coach is typing" }: { label?: string }) {
  return (
    <span role="status" aria-label={label} className="flex items-center gap-1">
      {[0, 150, 300].map((delay) => (
        <span
          key={delay}
          aria-hidden="true"
          style={{ animationDelay: `${delay}ms` }}
          className="size-2 animate-bounce rounded-full bg-ink-muted/60"
        />
      ))}
    </span>
  );
}
