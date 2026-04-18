export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <a href="/chat" className="text-sm text-emerald-600 font-medium mb-8 inline-block">← Back</a>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Terms of Use</h1>
        <p className="text-sm text-gray-400 mb-8">Last updated: April 2025</p>
        <div className="space-y-6 text-sm text-gray-600 leading-relaxed">
          <p>By using Youly (&quot;the App&quot;), you agree to these Terms of Use.</p>
          <section>
            <h2 className="font-semibold text-gray-800 mb-2">1. Eligibility</h2>
            <p>You must be at least 18 years old to use the App.</p>
          </section>
          <section>
            <h2 className="font-semibold text-gray-800 mb-2">2. Not Medical Advice</h2>
            <p>Youly provides general nutrition and wellness coaching powered by AI. It is not a substitute for professional medical advice, diagnosis, or treatment. Always consult a qualified healthcare provider before making significant changes to your diet or exercise routine.</p>
          </section>
          <section>
            <h2 className="font-semibold text-gray-800 mb-2">3. Account and Data</h2>
            <p>All health data you enter is stored locally on your device. You may optionally enable cloud backup, in which case an encrypted copy is stored securely solely to enable cross-device restore. We do not access, analyze, or share this data for any other purpose.</p>
          </section>
          <section>
            <h2 className="font-semibold text-gray-800 mb-2">4. Limitation of Liability</h2>
            <p>Youly is provided &quot;as is.&quot; We are not liable for any damages arising from your use of the App, including health outcomes from following AI-generated coaching suggestions.</p>
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
