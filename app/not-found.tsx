import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-brand-700">
        Youly
      </p>
      <h1 className="mt-6 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        We couldn&apos;t find that page
      </h1>
      <p className="mt-3 max-w-md text-base text-ink-muted">
        The link may be out of date. Your data is safe — nothing has changed in
        your account.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-brand-600 px-6 text-base font-semibold text-white shadow-cta transition-colors hover:bg-brand-700"
        >
          Go to the homepage
        </Link>
        <Link
          href="/app"
          className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border-strong px-6 text-base font-semibold text-ink-body transition-colors hover:bg-surface-sunken"
        >
          Open Youly
        </Link>
      </div>
    </main>
  );
}
