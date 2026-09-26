import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { PrivacyPolicy, LEGAL_LAST_UPDATED } from "@/components/legal/LegalContent";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Youly collects, stores, and protects your health data — and what we never do with it.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <div className="bg-canvas py-12 sm:py-16">
      <Container width="prose">
        <h1 className="text-3xl font-bold tracking-tight text-ink">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-ink-muted">
          Last updated: {LEGAL_LAST_UPDATED}
        </p>
        <div className="mt-8">
          <PrivacyPolicy />
        </div>
      </Container>
    </div>
  );
}
