import { Wordmark } from "@/components/brand/Wordmark";
import { cn } from "@/lib/cn";

/**
 * The "green header + white card" funnel layout, extracted from 4 verbatim
 * copies (intro, login, consent, onboarding's avatar picker). That shell was the
 * most phone-specific thing in the codebase: h-screen + overflow-hidden, a fake
 * pt-14 status bar, and a full-bleed white card that stretched across a desktop
 * monitor.
 *
 * What changed: h-dvh instead of h-screen (h-screen is the iOS address-bar bug),
 * real safe-area insets instead of hardcoded padding, and the card is capped and
 * centred from sm up so it reads as a card rather than a broken app.
 */
export function FunnelShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
  headerAction,
}: {
  eyebrow?: React.ReactNode;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerAction?: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh flex-col bg-brand-900">
      <header className="shrink-0 px-6 pt-safe sm:px-8">
        <div className="mx-auto w-full max-w-lg pt-8 pb-6">
          <div className="flex items-start justify-between gap-4">
            <Wordmark size="md" tone="onBrand" />
            {headerAction}
          </div>
          {eyebrow ? (
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.14em] text-brand-200">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-3 text-2xl font-bold leading-tight text-white sm:text-3xl">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2 text-base text-brand-50">{subtitle}</p>
          ) : null}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col sm:items-center sm:px-8 sm:pb-8">
        <div
          className={cn(
            "flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-surface",
            "rounded-t-3xl sm:max-w-lg sm:flex-none sm:rounded-3xl sm:shadow-raised"
          )}
        >
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</div>
          {footer ? (
            <div className="shrink-0 border-t border-border-subtle px-6 py-4 pb-safe sm:pb-4">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
