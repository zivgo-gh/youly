"use client";

import { useRouter } from "next/navigation";

export default function IntroPage() {
  const router = useRouter();

  const handleContinue = () => {
    localStorage.setItem("arc_intro_done", "true");
    router.push("/consent");
  };

  return (
    <div className="h-screen flex flex-col bg-emerald-700 text-white overflow-hidden">
      {/* Green header */}
      <div className="px-6 pt-14 pb-5 shrink-0">
        <p className="text-4xl font-black tracking-tight text-emerald-300 uppercase mb-3">Youly</p>
        <h1 className="text-[1.6rem] font-bold leading-snug text-white">
          Personalized weight loss,<br />without the complexity.
        </h1>
        <p className="text-emerald-200 text-sm mt-2">
          Just talk. Your coach handles the rest.
        </p>
      </div>

      {/* White card */}
      <div className="flex-1 bg-white rounded-t-3xl flex flex-col overflow-hidden">
        {/* Scrollable value props */}
        <div className="relative flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto px-6 pt-6 pb-4 space-y-4">
            {[
              {
                icon: "🎙️",
                title: "Log by talking",
                body: "Say \"I had a burger and fries\" — calories and protein logged instantly.",
              },
              {
                icon: "🧠",
                title: "A coach that adapts to you",
                body: "An AI dietitian + trainer that learns your style and adjusts its approach over time.",
              },
              {
                icon: "📍",
                title: "Week-by-week milestones",
                body: "Your journey is broken into small wins — no scary end dates.",
              },
              {
                icon: "✏️",
                title: "Easy to correct",
                body: "\"That was actually yesterday\" — your coach fixes it, no forms.",
              },
            ].map(({ icon, title, body }) => (
              <div key={title} className="flex gap-3 items-start">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-lg shrink-0">
                  {icon}
                </div>
                <div>
                  <p className="font-semibold text-gray-800 text-sm">{title}</p>
                  <p className="text-gray-400 text-sm leading-snug mt-0.5">{body}</p>
                </div>
              </div>
            ))}
          </div>
          {/* Scroll fade */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-white to-transparent" />
        </div>

        {/* CTA — pinned at bottom */}
        <div className="shrink-0 px-6 pt-2 pb-10">
          <button
            onClick={handleContinue}
            className="w-full py-4 rounded-2xl bg-emerald-500 text-white font-bold text-base shadow-lg active:scale-95 transition-transform"
          >
            Get started →
          </button>
        </div>
      </div>
    </div>
  );
}
