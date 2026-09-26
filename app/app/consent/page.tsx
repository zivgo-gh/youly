"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { recordConsent } from "@/lib/consent";
import { FunnelShell } from "@/components/layout/FunnelShell";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";
import { TermsOfUse, PrivacyPolicy } from "@/components/legal/LegalContent";

/**
 * Consent, recorded per-user in Postgres.
 *
 * This screen used to sit BEFORE login and write a device-global localStorage key
 * that nothing ever read — so consent was unattributable, unenforced, and erased by
 * Safari's 7-day storage cap. It now runs after login, where it can be tied to a
 * user, and it writes a versioned row.
 *
 * Critically, agreeing returns to /app, not /login. Sending an already-signed-in
 * user to /login would bounce them straight back here through the proxy — an
 * infinite loop between consent and sign-in.
 */
const PILLARS: Array<{ icon: IconName; title: string; body: string }> = [
  {
    icon: "lock",
    title: "Your data is private to you",
    body: "Your food logs, weight, goals, and conversations live in your own account and sync across your devices. Access is enforced per row at the database level, not by application code.",
  },
  {
    icon: "sparkles",
    title: "We use it to coach you, nothing else",
    body: "Your profile personalises your coaching. We don't sell it, share it, or use it for advertising. Conversations are processed by Anthropic's Claude to generate replies.",
  },
  {
    icon: "trash",
    title: "You stay in control",
    body: "Delete everything at any time — profile, logs, weights, saved meals, and chat history, from both your device and our database.",
  },
];

export default function ConsentPage() {
  const [showTerms, setShowTerms] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    createSupabaseBrowserClient()
      .auth.getUser()
      .then(({ data }) => {
        if (data.user) setUid(data.user.id);
        else window.location.replace("/login?next=/app");
      })
      .catch(() => setError("We couldn't verify your session. Please try again."));
  }, []);

  async function agree() {
    if (!uid) return;
    setSaving(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      await recordConsent(supabase, uid);
      // Back to the router, which will now send us on to onboarding or chat.
      window.location.replace("/app");
    } catch (e) {
      setSaving(false);
      // Never navigate on a failed write — /app would just send us back here.
      setError(
        e instanceof Error && e.message.includes("user_consents")
          ? "We couldn't save your consent. The database may still be setting up — please try again shortly."
          : "We couldn't save your consent. Please check your connection and try again."
      );
    }
  }

  return (
    <FunnelShell
      eyebrow="Before we start"
      title={
        <>
          Your privacy,
          <br />
          your control.
        </>
      }
      subtitle="Three things worth knowing, stated plainly."
      footer={
        <>
          <Button fullWidth size="lg" loading={saving} disabled={!uid} onClick={agree}>
            I agree — let&apos;s get started
          </Button>
          {error ? (
            <p role="alert" className="mt-3 text-center text-sm font-medium text-danger">
              {error}
            </p>
          ) : (
            <p className="mt-3 text-center text-xs leading-relaxed text-ink-muted">
              By continuing you agree to the Terms of Use and Privacy Policy.
            </p>
          )}
        </>
      }
    >
      <ul className="space-y-3">
        {PILLARS.map((p) => (
          <li
            key={p.title}
            className="flex items-start gap-3 rounded-2xl bg-surface-sunken px-4 py-3"
          >
            <span className="mt-0.5 shrink-0 text-brand-700">
              <Icon name={p.icon} />
            </span>
            <div>
              <p className="text-sm font-semibold text-ink">{p.title}</p>
              <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">
                {p.body}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <button
        type="button"
        onClick={() => setShowTerms((v) => !v)}
        aria-expanded={showTerms}
        aria-controls="full-terms"
        className="mt-5 flex min-h-11 items-center gap-1.5 text-sm font-semibold text-brand-700"
      >
        <Icon name={showTerms ? "chevron-up" : "chevron-down"} size={16} />
        {showTerms ? "Hide full terms" : "Read the full terms"}
      </button>

      {showTerms ? (
        <div
          id="full-terms"
          className="mt-3 space-y-8 border-t border-border-subtle pt-4"
        >
          <div>
            <h2 className="mb-3 text-base font-semibold text-ink">Terms of Use</h2>
            <TermsOfUse />
          </div>
          <div>
            <h2 className="mb-3 text-base font-semibold text-ink">Privacy Policy</h2>
            <PrivacyPolicy />
          </div>
        </div>
      ) : null}
    </FunnelShell>
  );
}
