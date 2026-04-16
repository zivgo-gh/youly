"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ConsentPage() {
  const router = useRouter();
  const [showFullTerms, setShowFullTerms] = useState(false);

  const handleAgree = () => {
    localStorage.setItem("arc_consent_done", "true");
    router.push("/login");
  };

  return (
    <div className="h-screen flex flex-col bg-emerald-700 overflow-hidden">
      {/* Green header */}
      <div className="px-6 pt-14 pb-5 shrink-0">
        <p className="text-4xl font-black tracking-tight text-emerald-300 uppercase mb-3">Youly</p>
        <h1 className="text-[1.6rem] font-bold leading-snug text-white">
          Your privacy,<br />your control.
        </h1>
        <p className="text-emerald-200 text-sm mt-2">We keep it simple and honest.</p>
      </div>

      {/* White card */}
      <div className="flex-1 bg-white rounded-t-3xl flex flex-col overflow-hidden">
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pt-6 pb-4">
          <h1 className="text-xl font-bold text-gray-800 mb-1">Your privacy matters</h1>
          <p className="text-sm text-gray-500 mb-5">
            Before we get started, here&apos;s how Youly handles your data.
          </p>

          {/* Three privacy pillars */}
          <div className="space-y-3 mb-6">
            <PrivacyRow
              icon="📱"
              title="Your data stays on your device"
              body="Your food logs, weight, and goals are stored locally on your phone. They never leave your device unless you choose to back them up."
            />
            <PrivacyRow
              icon="🔒"
              title="We use your data to coach you, nothing else"
              body="Your profile is used only to personalize your experience. We don't sell it, share it, or use it for advertising — ever."
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
            {showFullTerms ? "Hide full terms ↑" : "Read full terms →"}
          </button>

          {showFullTerms && (
            <div className="text-xs text-gray-500 leading-relaxed space-y-4 border-t border-gray-100 pt-4 mb-4">
              <TermsContent />
            </div>
          )}
        </div>

        {/* Pinned CTA */}
        <div className="shrink-0 px-6 pt-3 pb-10 border-t border-gray-100 bg-white">
          <button
            onClick={handleAgree}
            className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-base active:scale-95 transition-transform shadow-lg"
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
        <p>Last updated: April 2025. By using Youly (&quot;the App&quot;), you agree to these Terms of Use.</p>
      </section>
      <section>
        <h4 className="font-semibold text-gray-700 mb-1">1. Eligibility</h4>
        <p>You must be at least 18 years old to use the App.</p>
      </section>
      <section>
        <h4 className="font-semibold text-gray-700 mb-1">2. Not Medical Advice</h4>
        <p>Youly provides general nutrition and wellness coaching powered by AI. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider before making significant changes to your diet or exercise routine.</p>
      </section>
      <section>
        <h4 className="font-semibold text-gray-700 mb-1">3. Account and Data</h4>
        <p>All health data you enter is stored locally on your device. You may optionally enable cloud backup, in which case an encrypted copy is stored securely solely to enable cross-device restore. We do not access, analyze, or share this data for any other purpose.</p>
      </section>
      <section>
        <h4 className="font-semibold text-gray-700 mb-1">4. Limitation of Liability</h4>
        <p>Youly is provided &quot;as is.&quot; We are not liable for any damages arising from your use of the App, including health outcomes from following AI-generated coaching suggestions.</p>
      </section>
      <div className="border-t border-gray-100 my-4" />
      <section>
        <h3 className="font-semibold text-gray-700 mb-1">Privacy Policy</h3>
        <p>Last updated: April 2025.</p>
      </section>
      <section>
        <h4 className="font-semibold text-gray-700 mb-1">1. Information We Collect</h4>
        <p><strong>Identity:</strong> When you sign in with Google, we receive your name and email to create your account.</p>
        <p className="mt-1"><strong>Health data (local-only by default):</strong> Food logs, weight, targets, and conversation history are stored on your device only.</p>
        <p className="mt-1"><strong>Optional cloud backup:</strong> Your profile and logs are encrypted and stored on our servers solely to restore your data on a new device.</p>
      </section>
      <section>
        <h4 className="font-semibold text-gray-700 mb-1">2. How We Use Your Information</h4>
        <p>We use your identity to authenticate you. We do not use your information for advertising, build profiles for third parties, or sell data to anyone.</p>
      </section>
      <section>
        <h4 className="font-semibold text-gray-700 mb-1">3. AI Processing</h4>
        <p>Coaching conversations are processed by Anthropic&apos;s Claude AI. Please review Anthropic&apos;s privacy policy at anthropic.com for details.</p>
      </section>
      <section>
        <h4 className="font-semibold text-gray-700 mb-1">4. Data Deletion</h4>
        <p>Local data stays on your device until you delete it. Cloud backup is permanently deleted when you use &quot;Reset my data&quot; in the account menu.</p>
      </section>
      <section>
        <h4 className="font-semibold text-gray-700 mb-1">5. Contact</h4>
        <p>Questions? Contact us at privacy@youly.app.</p>
      </section>
    </>
  );
}
