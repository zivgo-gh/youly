"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";

export default function ConsentPage() {
  const router = useRouter();
  const [showFullTerms, setShowFullTerms] = useState(false);
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUid(data.user.id);
    });
  }, []);

  const handleAgree = () => {
    if (uid) {
      localStorage.setItem(`arc_consent_${uid}`, "true");
    }
    router.replace("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-emerald-600">
      {/* Header */}
      <div className="px-6 pt-14 pb-8 text-center">
        <div className="text-white text-4xl font-black tracking-tight uppercase mb-2">
          Youly
        </div>
        <p className="text-emerald-100 text-sm font-medium">
          Privacy &amp; Terms
        </p>
      </div>

      {/* White card */}
      <div className="flex-1 bg-white rounded-t-3xl flex flex-col">
        <div className="flex-1 overflow-y-auto px-6 pt-8 pb-4">
          <h1 className="text-xl font-bold text-gray-800 mb-1">
            Your privacy matters
          </h1>
          <p className="text-sm text-gray-500 mb-6">
            Before we get started, here&apos;s how Youly handles your data.
          </p>

          {/* Three privacy pillars */}
          <div className="space-y-4 mb-8">
            <PrivacyRow
              icon="📱"
              title="Your data stays on your device"
              body="Your food logs, weight, and goals are stored locally on your phone. They never leave your device unless you choose to back them up for cross-device access."
            />
            <PrivacyRow
              icon="🔒"
              title="We use your data to coach you, nothing else"
              body="Your profile is used only to personalize your experience. We don't sell it, share it with third parties, or use it for advertising — ever."
            />
            <PrivacyRow
              icon="🗑️"
              title="You're in control"
              body="Delete all your data anytime from the account menu. We'll permanently erase everything immediately, no questions asked."
            />
          </div>

          {/* Expandable full terms */}
          <button
            onClick={() => setShowFullTerms(!showFullTerms)}
            className="flex items-center gap-2 text-sm text-emerald-600 font-medium mb-3"
          >
            <span>{showFullTerms ? "Hide full terms ↑" : "Read full terms →"}</span>
          </button>

          {showFullTerms && (
            <div className="text-xs text-gray-500 leading-relaxed space-y-4 border-t border-gray-100 pt-4 mb-4">
              <TermsContent />
            </div>
          )}
        </div>

        {/* Sticky agree button */}
        <div className="px-6 pb-10 pt-4 border-t border-gray-100 bg-white">
          <button
            onClick={handleAgree}
            className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-base active:bg-emerald-600 transition-colors"
          >
            I agree — let&apos;s get started
          </button>
          <p className="text-center text-xs text-gray-400 mt-3 leading-relaxed">
            By tapping above you agree to the Terms of Use and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
}

function PrivacyRow({ icon, title, body }: { icon: string; title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 bg-gray-50 rounded-2xl px-4 py-3">
      <span className="text-xl mt-0.5">{icon}</span>
      <div>
        <p className="text-sm font-semibold text-gray-800">{title}</p>
        <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{body}</p>
      </div>
    </div>
  );
}

function TermsContent() {
  return (
    <>
      <section>
        <h3 className="font-semibold text-gray-700 mb-1">Terms of Use</h3>
        <p>
          Last updated: April 2025. By using Youly (&quot;the App&quot;), you agree to these Terms of Use.
          Please read them carefully.
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-gray-700 mb-1">1. Eligibility</h4>
        <p>
          You must be at least 18 years old to use the App. By using Youly, you confirm you meet
          this requirement.
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-gray-700 mb-1">2. Not Medical Advice</h4>
        <p>
          Youly provides general nutrition and wellness coaching powered by AI. It is not a
          substitute for professional medical advice, diagnosis, or treatment. Always consult a
          qualified healthcare provider before making significant changes to your diet or exercise
          routine, especially if you have a medical condition.
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-gray-700 mb-1">3. Account and Data</h4>
        <p>
          You are responsible for maintaining the security of your account credentials. All health
          data you enter — including food logs, weight, and goals — is stored locally on your device.
          You may optionally enable cloud backup, in which case an encrypted copy of your profile and
          logs is stored securely in our systems solely to enable cross-device restore. We do not
          access, analyze, or share this data for any other purpose.
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-gray-700 mb-1">4. Acceptable Use</h4>
        <p>
          You agree not to misuse the App, attempt to reverse engineer it, or use it in any way that
          could harm other users or violate applicable laws.
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-gray-700 mb-1">5. Limitation of Liability</h4>
        <p>
          Youly is provided &quot;as is.&quot; To the fullest extent permitted by law, we are not liable for
          any damages arising from your use of the App, including any health outcomes resulting from
          following AI-generated coaching suggestions.
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-gray-700 mb-1">6. Changes to Terms</h4>
        <p>
          We may update these Terms from time to time. Continued use of the App after changes
          constitutes acceptance.
        </p>
      </section>

      <div className="border-t border-gray-100 my-4" />

      <section>
        <h3 className="font-semibold text-gray-700 mb-1">Privacy Policy</h3>
        <p>
          Last updated: April 2025. This Privacy Policy explains how Youly collects, uses, and
          protects your information.
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-gray-700 mb-1">1. Information We Collect</h4>
        <p>
          <strong>Identity information:</strong> When you sign in with Google or Apple, we receive
          your name and email address from the authentication provider to create your account.
        </p>
        <p className="mt-1">
          <strong>Health data (local-only by default):</strong> Food logs, weight entries, calorie
          and protein targets, and coaching conversation history are stored on your device only. We
          do not collect this data unless you enable optional cloud backup.
        </p>
        <p className="mt-1">
          <strong>Optional cloud backup:</strong> If enabled, your profile and daily logs are
          encrypted and stored on our servers solely to allow you to restore your data on a new
          device. This data is never used for any other purpose.
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-gray-700 mb-1">2. How We Use Your Information</h4>
        <p>
          We use your identity information to authenticate you and associate your local data with
          your account. We do not use your information to serve advertisements, build user profiles
          for third parties, or sell data to anyone.
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-gray-700 mb-1">3. AI Processing</h4>
        <p>
          Your coaching conversations are processed by Anthropic&apos;s Claude AI. Conversation content
          is sent to Anthropic&apos;s API to generate responses. Please review Anthropic&apos;s privacy policy
          at anthropic.com for details on how they handle API data.
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-gray-700 mb-1">4. Data Retention and Deletion</h4>
        <p>
          Local data remains on your device until you delete it or reset the app. Cloud backup data
          is permanently deleted when you use the &quot;Reset my data&quot; option in the account menu, or
          when you delete your account. We retain authentication records as required by applicable law.
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-gray-700 mb-1">5. Third-Party Services</h4>
        <p>
          We use Supabase for authentication and optional backup storage, and Anthropic for AI
          coaching. These services have their own privacy policies.
        </p>
      </section>

      <section>
        <h4 className="font-semibold text-gray-700 mb-1">6. Contact</h4>
        <p>
          Questions about this policy? Contact us at privacy@youly.app.
        </p>
      </section>
    </>
  );
}
