import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { ButtonLink } from "@/components/ui/Button";
import { SessionCta } from "@/components/site/SessionCta";

export const metadata: Metadata = {
  title: "Log food by talking",
  description:
    "Youly is a conversational AI weight loss coach. Say what you ate and it tracks your calories and protein, adapts to how you work, and turns your goal into week-by-week milestones. Free.",
  alternates: { canonical: "/" },
};

const FEATURES: Array<{ icon: IconName; title: string; body: string }> = [
  {
    icon: "mic",
    title: "Log by talking",
    body: "Say “I had a burger and fries” and your calories and protein are logged, itemised per food. No searching a database, no weighing, no forms.",
  },
  {
    icon: "camera",
    title: "Snap a nutrition label",
    body: "Point your camera at a label and the coach reads the calories and protein off it. The photo is used for that message and never stored.",
  },
  {
    icon: "sparkles",
    title: "A coach that adapts",
    body: "It picks up how much detail you want and how you respond to being pushed, then adjusts. That carries across sessions instead of resetting.",
  },
  {
    icon: "target",
    title: "Week-by-week milestones",
    body: "Your goal is broken into small targets with real dates, so progress is something you can see this week — not a number months away.",
  },
  {
    icon: "pencil",
    title: "Fixing things is a sentence",
    body: "“That was actually yesterday” or “make it 600 calories” and it is corrected. No edit screens to hunt through.",
  },
  {
    icon: "meal",
    title: "Meals you eat often",
    body: "Save a regular meal once, then just say “log lunch #2”. It expands into every item with the right numbers.",
  },
];

const STEPS = [
  {
    title: "Answer a few questions",
    body: "Height, weight, goal, and how fast you want to move. Your calorie target comes from the Mifflin-St Jeor equation and your protein target from USDA guidance for your activity level.",
  },
  {
    title: "Talk to your coach",
    body: "Tell it what you ate, whenever you eat. It logs the food, itemises the macros, and tells you what you have left for the day.",
  },
  {
    title: "Watch the trend, not the day",
    body: "Progress charts show 30 days of calories, protein, and weight against your targets, plus where your current pace actually lands you.",
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero. Persuade-mode discipline: one value-prop line, one prominent CTA,
          both above the fold on a phone. Supporting detail goes below. */}
      <section className="bg-brand-700 py-16 sm:py-24">
        <Container width="wide">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-brand-200">
              Your AI weight loss coach
            </p>
            <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight text-white sm:text-5xl lg:text-6xl">
              Log food by talking.
            </h1>
            <p className="mt-5 text-lg leading-relaxed text-brand-50 sm:text-xl">
              Say what you ate. Youly tracks your calories and protein, learns how
              you work, and keeps your goal in reach — without a single form.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <SessionCta size="lg" />
              <ButtonLink
                href="/how-it-works"
                variant="secondary"
                size="lg"
                className="border-transparent bg-brand-600 text-white hover:bg-brand-800"
              >
                See how it works
              </ButtonLink>
            </div>
            <p className="mt-4 text-sm text-brand-100">
              Free to use. Sign in with Google — no credit card.
            </p>
          </div>
        </Container>
      </section>

      {/* The problem it's actually solving. */}
      <section className="py-16 sm:py-20">
        <Container width="wide">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Most food tracking fails for the same reason
            </h2>
            <p className="mt-4 text-base leading-relaxed text-ink-body sm:text-lg">
              It asks for too much. Search for the food, pick the right entry from
              nine near-identical ones, set a portion, pick a meal, save. Do that
              four times a day and you stop doing it by Thursday.
            </p>
            <p className="mt-4 text-base leading-relaxed text-ink-body sm:text-lg">
              Youly replaces all of it with a sentence. The estimating, the
              itemising, and the arithmetic are the coach&apos;s job — remembering
              what you ate is the only part left for you.
            </p>
          </div>
        </Container>
      </section>

      {/* What you get. */}
      <section className="bg-surface-sunken py-16 sm:py-20">
        <Container width="wide">
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            What Youly does
          </h2>
          <ul className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <Card as="li" key={f.title}>
                <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <Icon name={f.icon} size={22} />
                </span>
                <h3 className="mt-4 text-base font-semibold text-ink">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-body">{f.body}</p>
              </Card>
            ))}
          </ul>
        </Container>
      </section>

      {/* How it works, short form. */}
      <section className="py-16 sm:py-20">
        <Container width="wide">
          <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
            Getting started takes about a minute
          </h2>
          <ol className="mt-8 grid gap-8 sm:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <span className="tnum flex size-9 items-center justify-center rounded-full bg-brand-700 text-sm font-bold text-white">
                  {i + 1}
                </span>
                <h3 className="mt-4 text-base font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-body">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
          <div className="mt-10">
            <ButtonLink href="/how-it-works" variant="secondary">
              More detail
            </ButtonLink>
          </div>
        </Container>
      </section>

      {/* Trust. Stated plainly, and only things that are true. */}
      <section className="bg-surface-sunken py-16 sm:py-20">
        <Container width="wide">
          <div className="grid gap-6 sm:grid-cols-3">
            <Card>
              <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Icon name="lock" size={22} />
              </span>
              <h3 className="mt-4 text-base font-semibold text-ink">
                Your data is yours
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-body">
                Your records are readable only by your own account, enforced at the
                database level. We never sell or share them.{" "}
                <Link href="/privacy" className="font-medium text-brand-700 underline">
                  Read the policy
                </Link>
                .
              </p>
            </Card>
            <Card>
              <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Icon name="chart" size={22} />
              </span>
              <h3 className="mt-4 text-base font-semibold text-ink">
                Real targets, not guesses
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-body">
                Calorie targets use Mifflin-St Jeor with a deficit you choose.
                Protein follows USDA guidance for your activity level.
              </p>
            </Card>
            <Card>
              <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                <Icon name="shield" size={22} />
              </span>
              <h3 className="mt-4 text-base font-semibold text-ink">
                Coaching, not diagnosis
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-ink-body">
                Youly gives general nutrition and wellness coaching. It is not
                medical advice — talk to a clinician before big changes.
              </p>
            </Card>
          </div>
        </Container>
      </section>

      {/* Closing CTA. */}
      <section className="bg-brand-700 py-16 sm:py-20">
        <Container width="wide">
          <div className="max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Start with what you ate today.
            </h2>
            <p className="mt-4 text-lg text-brand-50">
              One sentence is enough to begin. Free, and it works on the phone
              that&apos;s already in your hand.
            </p>
            <div className="mt-8">
              <SessionCta size="lg" />
            </div>
          </div>
        </Container>
      </section>

      {/* Structured data so search engines understand what this is. Values here
          mirror the visible copy — nothing asserted that isn't on the page. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            name: "Youly",
            applicationCategory: "HealthApplication",
            operatingSystem: "Web",
            url: "https://www.youly.app",
            description:
              "A conversational AI weight loss coach. Log food by talking and it tracks your calories and protein.",
            offers: {
              "@type": "Offer",
              price: "0",
              priceCurrency: "USD",
            },
          }),
        }}
      />
    </>
  );
}
