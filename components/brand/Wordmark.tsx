import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * The single source of truth for the wordmark. It was previously retyped as a
 * bare <span> in 10 places at 3 sizes and 2 colours, and was never a link —
 * so the logo didn't take you home from anywhere in the product.
 *
 * Shared brand furniture: this deliberately does NOT inherit a page's local
 * type or colour choices. One wordmark, everywhere.
 */
const SIZES = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-4xl",
} as const;

export function Wordmark({
  size = "md",
  tone = "brand",
  href = "/",
  className,
}: {
  size?: keyof typeof SIZES;
  tone?: "brand" | "onBrand";
  href?: string | null;
  className?: string;
}) {
  const classes = cn(
    "font-bold uppercase tracking-[0.14em]",
    SIZES[size],
    tone === "brand" ? "text-brand-700" : "text-brand-200",
    className
  );

  if (!href) return <span className={classes}>Youly</span>;

  return (
    <Link href={href} className={cn(classes, "rounded-sm")}>
      <span className="sr-only">Youly — home</span>
      <span aria-hidden="true">Youly</span>
    </Link>
  );
}
