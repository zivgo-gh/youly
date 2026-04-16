"use client";

import { useState } from "react";

interface Props {
  coachName: string;
  onDone: () => void;
}

const STEPS = [
  {
    arrow: "up",
    target: "top",
    title: "Your daily targets",
    body: "These bars show your calories and protein for today. They fill up as you log meals — green means you're on track, orange means you've hit your limit.",
  },
  {
    arrow: "down",
    target: "bottom",
    title: "Talk to your coach",
    body: "Tap the mic and just say what you ate — \"I had a chicken sandwich for lunch\" — and your coach will log it and estimate the calories and protein automatically.",
  },
  {
    arrow: "down",
    target: "bottom",
    title: "Type if you prefer",
    body: "Not feeling the mic? You can always type instead. Ask questions, log food, check your progress — your coach handles it all.",
  },
];

export function FirstRunTour({ coachName, onDone }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <>
      {/* Dimmed backdrop */}
      <div className="fixed inset-0 z-40 bg-black/50" />

      {/* Tooltip card */}
      <div
        className={`fixed z-50 left-4 right-4 ${
          current.target === "top" ? "top-[130px]" : "bottom-[160px]"
        }`}
      >
        {/* Arrow pointing up toward macro strip */}
        {current.arrow === "up" && (
          <div className="flex justify-center mb-1">
            <div className="w-0 h-0 border-l-8 border-r-8 border-b-[10px] border-l-transparent border-r-transparent border-b-white" />
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-2xl p-5">
          {/* Progress dots */}
          <div className="flex gap-1.5 mb-4">
            {STEPS.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === step ? "w-6 bg-emerald-500" : "w-1.5 bg-gray-200"
                }`}
              />
            ))}
          </div>

          <p className="text-base font-bold text-gray-800 mb-1">{current.title}</p>
          <p className="text-sm text-gray-500 leading-relaxed mb-5">{current.body}</p>

          <div className="flex gap-3">
            {!isLast ? (
              <>
                <button
                  onClick={onDone}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-400 font-medium"
                >
                  Skip
                </button>
                <button
                  onClick={() => setStep(step + 1)}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold"
                >
                  Next →
                </button>
              </>
            ) : (
              <button
                onClick={onDone}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-semibold"
              >
                Let&apos;s go!
              </button>
            )}
          </div>
        </div>

        {/* Arrow pointing down toward mic */}
        {current.arrow === "down" && (
          <div className="flex justify-center mt-1">
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-[10px] border-l-transparent border-r-transparent border-t-white" />
          </div>
        )}
      </div>

      {/* Coach intro label — only on step 0 */}
      {step === 0 && (
        <div className="fixed z-50 left-0 right-0 top-[85px] flex justify-center pointer-events-none">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0ms]" />
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:150ms]" />
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:300ms]" />
          </div>
        </div>
      )}
    </>
  );
}
