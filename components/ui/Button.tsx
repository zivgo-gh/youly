import Link from "next/link";
import { cn } from "@/lib/cn";

/**
 * Replaces 11 inlined primary buttons (in 4 different size/weight combos) and 3
 * inlined secondaries. Every variant clears the 44px touch minimum and inherits
 * the global :focus-visible ring.
 */
type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-brand-600 text-white shadow-cta hover:bg-brand-700 active:bg-brand-800",
  secondary:
    "border border-border-strong bg-surface text-ink-body hover:bg-surface-sunken",
  ghost: "text-brand-700 hover:bg-brand-50",
  danger: "bg-danger text-white hover:brightness-95",
};

const SIZES: Record<Size, string> = {
  sm: "min-h-9 px-3 text-sm gap-1.5",
  md: "min-h-11 px-5 text-base gap-2",
  lg: "min-h-13 px-6 text-base gap-2",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  className?: string;
  children: React.ReactNode;
};

function classes({ variant = "primary", size = "md", fullWidth, className }: CommonProps) {
  return cn(
    "inline-flex items-center justify-center rounded-2xl font-semibold",
    "transition-[background-color,box-shadow,transform] duration-150",
    // Scale feedback that doesn't shift surrounding layout.
    "active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50",
    VARIANTS[variant],
    SIZES[size],
    fullWidth && "w-full",
    className
  );
}

export function Button({
  type = "button",
  disabled,
  onClick,
  ...props
}: CommonProps & {
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: () => void;
}) {
  const { loading, children } = props;
  return (
    <button
      type={type}
      onClick={onClick}
      // A loading button must not be re-submittable, and the state has to be
      // announced, not just spun.
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes(props)}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}

export function ButtonLink({
  href,
  ...props
}: CommonProps & { href: string }) {
  return (
    <Link href={href} className={classes(props)}>
      {props.children}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
    />
  );
}
