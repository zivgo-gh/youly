import Link from "next/link";
import { Wordmark } from "@/components/brand/Wordmark";
import { Container } from "@/components/ui/Container";
import { ButtonLink } from "@/components/ui/Button";
import { SessionCta } from "./SessionCta";

const NAV = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border-subtle bg-surface/90 backdrop-blur">
      <Container width="wide">
        <div className="flex min-h-16 items-center justify-between gap-4">
          <Wordmark size="md" />

          {/* Links collapse below sm rather than becoming a hamburger — there are
              three of them, and a menu for three links is worse than wrapping. */}
          <nav aria-label="Site" className="hidden items-center gap-6 sm:flex">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-ink-body transition-colors hover:text-brand-700"
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <SessionCta size="sm" />
        </div>
      </Container>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border-subtle bg-surface-sunken py-10">
      <Container width="wide">
        <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
          <div>
            <Wordmark size="md" />
            <p className="mt-3 max-w-xs text-sm text-ink-muted">
              A conversational AI coach for sustainable weight loss.
            </p>
          </div>

          <nav aria-label="Footer" className="flex flex-col gap-8 sm:flex-row sm:gap-16">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Product
              </h2>
              <ul className="mt-3 space-y-2">
                {NAV.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="text-sm text-ink-body hover:text-brand-700"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Legal
              </h2>
              <ul className="mt-3 space-y-2">
                <li>
                  <Link href="/privacy" className="text-sm text-ink-body hover:text-brand-700">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="text-sm text-ink-body hover:text-brand-700">
                    Terms of Use
                  </Link>
                </li>
                <li>
                  <a
                    href="mailto:support@youly.app"
                    className="text-sm text-ink-body hover:text-brand-700"
                  >
                    support@youly.app
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border-subtle pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-ink-muted">
            © {new Date().getFullYear()} Youly. Not medical advice.
          </p>
          <ButtonLink href="/app" variant="ghost" size="sm">
            Open Youly
          </ButtonLink>
        </div>
      </Container>
    </footer>
  );
}
