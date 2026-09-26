/**
 * The canonical legal copy. Previously this text existed in three places — the
 * standalone /privacy and /terms pages, plus an abbreviated (and therefore
 * already-diverging) copy inside the consent screen. One source now.
 *
 * When this text changes, bump TERMS_VERSION / PRIVACY_VERSION in lib/consent.ts
 * so users are asked to re-consent.
 */
export const LEGAL_LAST_UPDATED = "August 2026";

function Section({
  heading,
  children,
}: {
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="mb-2 font-semibold text-ink">{heading}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

const MAIL = (
  <a href="mailto:support@youly.app" className="font-medium text-brand-700 underline">
    support@youly.app
  </a>
);

export function TermsOfUse() {
  return (
    <div className="space-y-6 text-sm leading-relaxed text-ink-body">
      <p>By using Youly (&quot;the App&quot;), you agree to these Terms of Use.</p>
      <Section heading="1. Eligibility">
        <p>You must be at least 18 years old to use the App.</p>
      </Section>
      <Section heading="2. Not medical advice">
        <p>
          Youly provides general nutrition and wellness coaching powered by AI. It
          is not a substitute for professional medical advice, diagnosis, or
          treatment. Always consult a qualified healthcare provider before making
          significant changes to your diet or exercise routine.
        </p>
      </Section>
      <Section heading="3. Account and data">
        <p>
          Health data you enter is stored in your Youly account on our hosted
          database so that it syncs across your devices, with a copy cached on your
          device for offline access. Your data is isolated from other users&apos;
          data by per-row access controls and transmitted over encrypted
          connections. We do not access, analyze, or share it for any purpose other
          than providing coaching to you.
        </p>
      </Section>
      <Section heading="4. Limitation of liability">
        <p>
          Youly is provided &quot;as is.&quot; We are not liable for any damages
          arising from your use of the App, including health outcomes from following
          AI-generated coaching suggestions.
        </p>
      </Section>
      <Section heading="5. Contact">
        <p>Questions? Email us at {MAIL}.</p>
      </Section>
    </div>
  );
}

export function PrivacyPolicy() {
  return (
    <div className="space-y-6 text-sm leading-relaxed text-ink-body">
      <Section heading="1. Information we collect">
        <p>
          <strong className="font-semibold text-ink">Identity:</strong> When you
          sign in with Google, we receive your name and email to create your
          account.
        </p>
        <p>
          <strong className="font-semibold text-ink">Health data:</strong> Food
          logs, weight, targets, saved meals, and conversation history are stored in
          your Youly account on our hosted database, so they are available on any
          device you sign in from. A copy is also cached on your device for offline
          access.
        </p>
        <p>
          <strong className="font-semibold text-ink">Isolation:</strong> Your
          records are readable and writable only by your signed-in account, enforced
          by per-row access controls at the database level, and transmitted over
          encrypted connections.
        </p>
      </Section>
      <Section heading="2. How we use your information">
        <p>
          We use your identity to authenticate you. We do not use your information
          for advertising, build profiles for third parties, or sell data to anyone.
        </p>
      </Section>
      <Section heading="3. AI processing">
        <p>
          Coaching conversations are processed by Anthropic&apos;s Claude AI. Please
          review Anthropic&apos;s privacy policy at anthropic.com for details.
        </p>
      </Section>
      <Section heading="4. Data deletion">
        <p>
          Resetting the app permanently deletes your profile, food logs, weights,
          saved meals, and conversation history from both your device and our
          database. To request complete deletion of your account, contact us at{" "}
          {MAIL}.
        </p>
      </Section>
      <Section heading="5. Contact">
        <p>Questions? Email us at {MAIL}.</p>
      </Section>
    </div>
  );
}
