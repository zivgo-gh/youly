import { cn } from "@/lib/cn";

/**
 * Replaces 6 hand-rolled max-width wrappers that all disagreed with each other.
 * `prose` is the reading measure (legal pages), `wide` is marketing sections.
 */
export function Container({
  width = "default",
  className,
  children,
}: {
  width?: "prose" | "default" | "wide";
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full px-4 sm:px-6",
        width === "prose" && "max-w-2xl",
        width === "default" && "max-w-3xl",
        width === "wide" && "max-w-6xl",
        className
      )}
    >
      {children}
    </div>
  );
}
