import { cn } from "@/lib/cn";

/** Replaces 9 inlined card treatments across progress and meals. */
export function Card({
  as: Tag = "div",
  padded = true,
  className,
  children,
}: {
  as?: "div" | "section" | "li" | "article";
  padded?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <Tag
      className={cn(
        "rounded-2xl border border-border-subtle bg-surface-raised shadow-card",
        padded && "p-5 sm:p-6",
        className
      )}
    >
      {children}
    </Tag>
  );
}

/**
 * The small all-caps label above a card's content. Replaces 16 copies at 3
 * different sizes — and raises them off text-gray-400, which failed contrast.
 */
export function CardLabel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <p
      className={cn(
        "text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted",
        className
      )}
    >
      {children}
    </p>
  );
}
