import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <span className="text-xl font-bold text-blue-600">FeedbackTool</span>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-gray-700 hover:text-gray-900">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700 transition-colors"
            >
              Start free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 py-24 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-6">
          Customer feedback that
          <br />
          <span className="text-blue-600">drives decisions</span>
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Build surveys, track NPS, analyze sentiment with AI, and integrate with your
          tools. All in one platform designed for product teams.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            href="/signup"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Start collecting feedback
          </Link>
          <Link
            href="#features"
            className="border border-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            See features
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Everything you need</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Survey Builder",
              description:
                "Drag-and-drop builder with multiple question types. NPS, rating scales, open text, multiple choice, and more.",
            },
            {
              title: "AI Sentiment Analysis",
              description:
                "Automatically classify open-text responses as positive, negative, or neutral. Extract themes and categories.",
            },
            {
              title: "NPS Tracking",
              description:
                "Track your Net Promoter Score over time. See promoters, passives, and detractors at a glance.",
            },
            {
              title: "Embeddable Widget",
              description:
                "Add a single script tag to your website. Collect feedback without leaving your app.",
            },
            {
              title: "Webhook Integrations",
              description:
                "Real-time notifications to Slack, your CRM, or any endpoint. HMAC-signed payloads with automatic retries.",
            },
            {
              title: "GDPR Compliant",
              description:
                "Data stored in the EU. Consent tracking, data deletion, and export built in. Your users' privacy matters.",
            },
          ].map((feature, i) => (
            <div key={i} className="p-6 bg-gray-50 rounded-xl">
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-gray-600 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t mt-16">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-sm text-gray-500">
          <p>FeedbackTool - Customer feedback and survey platform</p>
          <p className="mt-2">GDPR compliant. Data stored in the EU.</p>
        </div>
      </footer>
    </div>
  );
}
