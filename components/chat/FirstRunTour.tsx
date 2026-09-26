"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Icon, type IconName } from "@/components/ui/Icon";

interface Props {
  coachName: string;
  onDone: () => void;
}

/**
 * First-run walkthrough.
 *
 * Previously this positioned itself with hardcoded pixel offsets — top-[130px],
 * top-[56px], bottom-[160px] — measured against the old mobile header and macro
 * strip, plus arrows pointing at them. Those numbers pointed at nothing once the
 * layout changed, and they were never right on desktop at all.
 *
 * It is now a centred dialog that describes the UI instead of pointing at
 * coordinates, so it survives layout changes. It also finally uses `coachName`,
 * which was accepted and ignored, meaning the tour never named the coach it was
 * introducing.
 */
const STEPS: Array<{ icon: IconName; title: string; body: string }> = [
  {
    icon: "mic",
    title: "Just say what you ate",
    body: "Tap the big mic button and talk — “I had a chicken sandwich for lunch”. Your coach logs it and estimates the calories and protein for you. No searching, no forms.",
  },
  {
    icon: "target",
    title: "Watch your daily targets",
    body: "The bars at the top fill as you log. Each one tells you how much you have left, or how far over you are — in words, not just colour.",
  },
  {
    icon: "camera",
    title: "Packaged food? Photograph the label",
    body: "The camera button reads calories and protein straight off a nutrition label, so those entries are exact rather than estimated.",
  },
  {
    icon: "chart",
    title: "Progress lives in its own tab",
    body: "Head to Progress for 30-day calorie, protein, and weight trends, plus your milestones. Meals is where you save the things you eat often.",
  },
];

export function FirstRunTour({ coachName, onDone }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const panelRef = useRef<HTMLDivElement>(null);

  // Escape skips the tour — it used to be dismissable only by finding the button.
  useEffect(() => {
    panelRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onDone();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div aria-hidden="true" className="absolute inset-0 bg-black/50" />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        tabIndex={-1}
        className="relative w-full max-w-md rounded-3xl bg-surface p-6 shadow-sheet"
      >
        <div className="flex gap-1.5" aria-hidden="true">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === step ? "w-6 bg-brand-600" : "w-1.5 bg-border-strong"
              )}
            />
          ))}
        </div>
        <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
          Step {step + 1} of {STEPS.length}
        </p>

        <span className="mt-3 flex size-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-700">
          <Icon name={current.icon} size={22} />
        </span>

        <h2 id="tour-title" className="mt-4 text-lg font-semibold text-ink">
          {step === 0 ? `${coachName} is ready — here's the tour` : current.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-body">{current.body}</p>

        <div className="mt-6 flex gap-3">
          {!isLast ? (
            <>
              <Button variant="secondary" fullWidth onClick={onDone}>
                Skip
              </Button>
              <Button fullWidth onClick={() => setStep(step + 1)}>
                Next
              </Button>
            </>
          ) : (
            <Button fullWidth onClick={onDone}>
              Let&apos;s go
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
