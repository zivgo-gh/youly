import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/ui/Icon";
import { SessionCta } from "@/components/site/SessionCta";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How Youly turns a spoken sentence into logged calories and protein — onboarding, voice logging, nutrition-label photos, corrections, saved meals, and progress tracking.",
  alternates: { canonical: "/how-it-works" },
};

const SECTIONS: Array<{
  icon: IconName;
  title: string;
  body: string[];
}> = [
  {
    icon: "user",
    title: "1. Onboarding sets your targets",
    body: [
      "You pick a coach, then answer a short series of questions — one at a time, in conversation rather than on a form. Height, current weight, goal weight, activity level, and how aggressively you want to move.",
      "From that, your daily calorie target is calculated with the Mifflin-St Jeor equation for resting metabolic rate, scaled by your activity level, minus the deficit matching your chosen pace (250, 500, or 750 calories a day for slow, moderate, or aggressive).",
      "Your protein target follows USDA dietary reference intake guidance in grams per kilogram of bodyweight, scaled by activity: 1.0 sedentary, 1.2 light, 1.4 moderate, 1.6 active.",
    ],
  },
  {
    icon: "mic",
    title: "2. Logging is one sentence",
    body: [
      "Tap the mic and say what you ate. The coach estimates the calories and protein, breaks the meal into its individual items so you can see where the numbers came from, and writes it to your log.",
      "You can type instead if you'd rather. Either way there is nothing to search and nothing to weigh.",
      "When you eat something with a label on it, photograph the label. The coach reads the values off the photo and asks how many servings you had. The image is used for that one message and is never stored.",
    ],
  },
  {
    icon: "pencil",
    title: "3. Corrections are conversational",
    body: [
      "Estimates are estimates, so fixing them has to be trivial. “That was actually yesterday”, “make the burger 700 calories”, “drop the fries” — the coach edits the entry and confirms what changed.",
      "Days within the last three remain editable. Older days become read-only so your history stays stable.",
    ],
  },
  {
    icon: "meal",
    title: "4. Regular meals get saved",
    body: [
      "If you eat the same breakfast most mornings, save it once. Say “save that as my lunch” and it is stored with every item and its macros.",
      "After that, “log lunch #2” expands the whole meal in a single message. Saved meals can be edited any time from the Meals screen.",
    ],
  },
  {
    icon: "chart",
    title: "5. Progress is a trend, not a verdict",
    body: [
      "The progress screen charts 30 days of calories, protein, and weight against your targets, so a heavy Saturday reads as a data point rather than a failure.",
      "Your goal is split into week-by-week milestones with real dates. Alongside them you see where your current pace actually lands you, recalculated from your last 14 days — which is often not the date you started with.",
      "You can also generate a written recap of your week: what went well, which patterns to watch, and one thing to focus on next.",
    ],
  },
  {
    icon: "sparkles",
    title: "6. The coach adapts to you",
    body: [
      "As you talk, the coach notes how you respond — whether you want the science or the short version, whether encouragement or bluntness works better, how you like to be checked in on.",
      "That state persists between sessions, so the coach you have in month two is tuned to you rather than reset to default.",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <section className="bg-brand-700 py-14 sm:py-20">
        <Container width="wide">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
              How Youly works
            </h1>
            <p className="mt-4 text-lg text-brand-50">
              From a spoken sentence to a tracked day — and what the numbers are
              actually based on.
            </p>
          </div>
        </Container>
      </section>

      <section className="py-14 sm:py-20">
        <Container width="wide">
          <div className="grid gap-6 lg:grid-cols-2">
            {SECTIONS.map((s) => (
              <Card as="section" key={s.title}>
                <span className="flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
                  <Icon name={s.icon} size={22} />
                </span>
                <h2 className="mt-4 text-lg font-semibold text-ink">{s.title}</h2>
                <div className="mt-3 space-y-3">
                  {s.body.map((p) => (
                    <p key={p} className="text-sm leading-relaxed text-ink-body">
                      {p}
                    </p>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      <section className="bg-surface-sunken py-14 sm:py-20">
        <Container width="wide">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
              Try it with one meal
            </h2>
            <p className="mt-3 text-base text-ink-body">
              Onboarding takes about a minute, and you can log your first meal
              straight after. It&apos;s free.
            </p>
            <div className="mt-6">
              <SessionCta size="lg" />
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
