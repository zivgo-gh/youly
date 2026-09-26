import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { TermsOfUse, LEGAL_LAST_UPDATED } from "@/components/legal/LegalContent";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms that apply when you use Youly.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <div className="bg-canvas py-12 sm:py-16">
      <Container width="prose">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Terms of Use</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Last updated: {LEGAL_LAST_UPDATED}
        </p>
        <div className="mt-8">
          <TermsOfUse />
        </div>
      </Container>
    </div>
  );
}
