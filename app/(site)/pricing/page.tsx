import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/ui/Icon";
import { SessionCta } from "@/components/site/SessionCta";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Youly is free to use. Every feature is included — voice logging, nutrition-label photos, saved meals, progress tracking, and weekly summaries.",
  alternates: { canonical: "/pricing" },
};

// Everything listed here ships today. Nothing is described as "coming soon",
// because a pricing page is the worst place to promise something.
const INCLUDED = [
  "Unlimited conversational food logging, by voice or text",
  "Nutrition-label photo reading",
  "Per-item calorie and protein breakdowns",
  "Personalised calorie and protein targets",
  "Saved meals you can log by name",
  "30-day calorie, protein, and weight charts",
  "Week-by-week milestones and pace projection",
  "AI-written weekly summaries",
  "A coach that adapts to how you work",
];

export default function PricingPage() {
  return (
    <>
      <section className="bg-brand-700 py-14 sm:py-20">
        <Container width="wide">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
              Youly is free
            </h1>
            <p className="mt-4 text-lg text-brand-50">
              Every feature, no tiers, no trial timer, no card. If that changes,
              anyone already using Youly will hear it from us first.
            </p>
          </div>
        </Container>
      </section>

      <section className="py-14 sm:py-20">
        <Container width="wide">
          <div className="mx-auto max-w-xl">
            <Card className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                Everything included
              </p>
              <p className="mt-3 flex items-baseline justify-center gap-2">
                <span className="tnum text-5xl font-bold tracking-tight text-ink">
                  $0
                </span>
                <span className="text-base text-ink-muted">/ month</span>
              </p>
              <div className="mt-7">
                <SessionCta size="lg" className="w-full" />
              </div>
              <p className="mt-3 text-sm text-ink-muted">
                Sign in with Google to start.
              </p>

              <ul className="mt-8 space-y-3 text-left">
                {INCLUDED.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 text-brand-700">
                      <Icon name="check" size={18} />
                    </span>
                    <span className="text-sm leading-relaxed text-ink-body">
                      {item}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>

            <div className="mt-8 space-y-4 text-sm leading-relaxed text-ink-body">
              <div>
                <h2 className="font-semibold text-ink">
                  Why is it free right now?
                </h2>
                <p className="mt-1">
                  Youly is early. Running it costs real money in AI usage, so this
                  won&apos;t be true forever — but it is true today, and we&apos;d
                  rather say that plainly than hide a price behind a signup.
                </p>
              </div>
              <div>
                <h2 className="font-semibold text-ink">What about my data?</h2>
                <p className="mt-1">
                  Free doesn&apos;t mean ad-funded. We don&apos;t sell your data,
                  share it, or use it for advertising — see the{" "}
                  <Link href="/privacy" className="font-medium text-brand-700 underline">
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
              <div>
                <h2 className="font-semibold text-ink">Can I delete everything?</h2>
                <p className="mt-1">
                  Yes, from inside the app, at any time — profile, food logs,
                  weights, saved meals, and conversation history, from both your
                  device and our database.
                </p>
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
