import type { Metadata } from "next";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { Card } from "@/components/ui/Card";
import { SessionCta } from "@/components/site/SessionCta";

export const metadata: Metadata = {
  title: "FAQ",
  description:
    "Common questions about Youly — how accurate the estimates are, whether it works offline, what happens to your data, and whether it replaces medical advice.",
  alternates: { canonical: "/faq" },
};

// Answers are plain text so the same strings can feed the FAQPage JSON-LD below
// without the markup and the structured data drifting apart.
const FAQS: Array<{ q: string; a: string }> = [
  {
    q: "How accurate are the calorie estimates?",
    a: "They are estimates, and they are meant to be. An AI estimate of a described meal will not match a food scale. But tracking you actually keep doing beats precise tracking you abandon in a week. When accuracy matters, photograph the nutrition label: the numbers then come off the label instead of an estimate. You can also correct any entry just by saying so.",
  },
  {
    q: "Do I need to weigh or measure my food?",
    a: "No. You describe it in normal language and the coach estimates portions. If you do know exact values you can give them, and they will be used as-is.",
  },
  {
    q: "Does it work on my phone?",
    a: "Youly is a website, so it works in your phone's browser with nothing to install. It is built mobile-first (voice logging in particular is designed for a phone) and it also works on a laptop. You can add it to your home screen if you want it to feel like an app.",
  },
  {
    q: "Does voice input work everywhere?",
    a: "Voice uses your browser's built-in speech recognition, which is available in Safari on iOS and in Chrome. If your browser doesn't support it, everything still works by typing.",
  },
  {
    q: "What happens to my data?",
    a: "It is stored in your own account and readable only by you, enforced at the database level rather than by application code. A copy is cached on your device so the app opens instantly and works when your connection is poor. We never sell or share it, and you can delete all of it from inside the app at any time.",
  },
  {
    q: "Can I use it on more than one device?",
    a: "Yes. Your profile, food logs, weights, saved meals, and conversation history live in your account, so signing in anywhere brings everything with you.",
  },
  {
    q: "Is this medical advice?",
    a: "No. Youly offers general nutrition and wellness coaching and is not a substitute for professional medical advice, diagnosis, or treatment. Talk to a qualified healthcare provider before making significant changes to your diet or exercise, particularly if you have an existing condition.",
  },
  {
    q: "How is my calorie target calculated?",
    a: "Your resting metabolic rate uses the Mifflin-St Jeor equation, scaled by your activity level to get total daily energy expenditure, then reduced by the deficit matching the pace you chose: 250, 500, or 750 calories a day. Protein follows USDA dietary reference intake guidance per kilogram of bodyweight, scaled by activity level.",
  },
  {
    q: "Are the four coaches different?",
    a: "Only visually: the name and picture you pick. All four behave identically at the start. What actually differentiates your coach over time is that it adapts to how you respond.",
  },
  {
    q: "What does it cost?",
    a: "Nothing today. Youly is free with every feature included and no card required.",
  },
];

export default function FaqPage() {
  return (
    <>
      <section className="bg-brand-700 py-14 sm:py-20">
        <Container width="wide">
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl lg:text-5xl">
              Questions
            </h1>
            <p className="mt-4 text-lg text-brand-50">
              Straight answers, including the ones that are not flattering.
            </p>
          </div>
        </Container>
      </section>

      <section className="py-14 sm:py-20">
        <Container width="prose">
          <dl className="space-y-5">
            {FAQS.map(({ q, a }) => (
              <Card as="div" key={q}>
                <dt className="text-base font-semibold text-ink">{q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-ink-body">{a}</dd>
              </Card>
            ))}
          </dl>

          <p className="mt-8 text-sm text-ink-muted">
            Something not answered here? Email{" "}
            <a
              href="mailto:support@youly.app"
              className="font-medium text-brand-700 underline"
            >
              support@youly.app
            </a>{" "}
            — or read the{" "}
            <Link href="/privacy" className="font-medium text-brand-700 underline">
              Privacy Policy
            </Link>{" "}
            and{" "}
            <Link href="/terms" className="font-medium text-brand-700 underline">
              Terms of Use
            </Link>
            .
          </p>

          <div className="mt-10">
            <SessionCta size="lg" />
          </div>
        </Container>
      </section>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: FAQS.map(({ q, a }) => ({
              "@type": "Question",
              name: q,
              acceptedAnswer: { "@type": "Answer", text: a },
            })),
          }),
        }}
      />
    </>
  );
}
