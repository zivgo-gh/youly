export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <a href="/chat" className="text-sm text-emerald-600 font-medium mb-8 inline-block">← Back</a>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Privacy Policy</h1>
        <p className="text-sm text-gray-400 mb-8">Last updated: April 2025</p>
        <div className="space-y-6 text-sm text-gray-600 leading-relaxed">
          <section>
            <h2 className="font-semibold text-gray-800 mb-2">1. Information We Collect</h2>
            <p><strong>Identity:</strong> When you sign in with Google, we receive your name and email to create your account.</p>
            <p className="mt-2"><strong>Health data (local-only by default):</strong> Food logs, weight, targets, and conversation history are stored on your device only.</p>
            <p className="mt-2"><strong>Optional cloud backup:</strong> Your profile and logs are encrypted and stored on our servers solely to restore your data on a new device.</p>
          </section>
          <section>
            <h2 className="font-semibold text-gray-800 mb-2">2. How We Use Your Information</h2>
            <p>We use your identity to authenticate you. We do not use your information for advertising, build profiles for third parties, or sell data to anyone.</p>
          </section>
          <section>
            <h2 className="font-semibold text-gray-800 mb-2">3. AI Processing</h2>
            <p>Coaching conversations are processed by Anthropic&apos;s Claude AI. Please review Anthropic&apos;s privacy policy at anthropic.com for details.</p>
          </section>
          <section>
            <h2 className="font-semibold text-gray-800 mb-2">4. Data Deletion</h2>
            <p>Local data stays on your device until you clear it. To request complete deletion of your account and any cloud backup, contact us at support@youly.app.</p>
          </section>
          <section>
            <h2 className="font-semibold text-gray-800 mb-2">5. Contact</h2>
            <p>Questions? Email us at <a href="mailto:support@youly.app" className="text-emerald-600 underline">support@youly.app</a>.</p>
          </section>
        </div>
      </div>
    </div>
  );
}
