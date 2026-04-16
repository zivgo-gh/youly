"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { AVATARS } from "@/lib/types";
import { CoachPhoto } from "@/components/shared/CoachPhoto";
import type { UserProfile, CoachAvatar } from "@/lib/types";
import { saveProfile } from "@/lib/storage";
import { calcTargets, predictGoalDate } from "@/lib/calories";

export default function OnboardingPage() {
  const router = useRouter();
  const [selectedAvatar, setSelectedAvatar] = useState<CoachAvatar | null>(null);
  const [input, setInput] = useState("");
  const [interimText, setInterimText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const handleProfileComplete = useCallback(
    (profileJson: string) => {
      try {
        const raw = JSON.parse(profileJson);
        const dailyDeficit: number = raw.dailyDeficit ?? 500;
        const weeklyLossLbs = dailyDeficit / 500;
        const targets = calcTargets(
          raw.sex,
          raw.currentWeightLbs,
          raw.heightIn,
          raw.age,
          raw.activityLevel,
          dailyDeficit
        );
        const predictedGoalDate = predictGoalDate(
          raw.currentWeightLbs,
          raw.goalWeightLbs,
          weeklyLossLbs
        );

        const profile: UserProfile = {
          ...raw,
          dailyDeficit,
          dailyCalorieTarget: targets.calories,
          dailyProteinTarget: targets.protein,
          predictedGoalDate,
          coachStyle: {
            supportLevel: 5,
            techDepth: 5,
            checkInStyle: "conversational",
            observations: [],
          },
          onboardingComplete: true,
          createdAt: new Date().toISOString(),
        };

        saveProfile(profile);
        setTimeout(() => router.push("/chat"), 1500);
      } catch (e) {
        console.error("Failed to parse profile", e);
      }
    },
    [router]
  );

  const { messages, streamingText, isLoading, sendMessage } = useStreamingChat({
    endpoint: "/api/onboarding",
    getBody: (msgs) => ({ messages: msgs, avatar: selectedAvatar }),
    onProfileComplete: handleProfileComplete,
  });

  const submitMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || isLoading) return;
      setInput("");
      setInterimText("");
      await sendMessage(trimmed);
    },
    [isLoading, sendMessage]
  );

  const { isListening, toggle } = useSpeechRecognition({
    onFinalResult: (transcript) => {
      setInterimText("");
      submitMessage(transcript);
    },
    onInterimResult: (interim) => setInterimText(interim),
  });

  // Once avatar is chosen, kick off the intro
  useEffect(() => {
    if (selectedAvatar) {
      sendMessage("start");
    }
  }, [selectedAvatar]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    submitMessage(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Hide the "start" trigger message from display
  const displayMessages = messages.filter(
    (m, i) => !(i === 0 && m.role === "user" && m.content === "start")
  );

  // ── Avatar picker ──────────────────────────────────────────────────────────
  if (!selectedAvatar) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex flex-col">
        <header className="px-6 py-5 flex items-center justify-between">
          <span className="text-2xl font-bold text-emerald-600">Youly</span>
          <button
            onClick={() => { if (confirm("Reset and start over?")) { localStorage.clear(); window.location.reload(); } }}
            className="text-xs text-gray-300 hover:text-red-400 transition-colors"
          >
            Reset
          </button>
        </header>

        <div className="flex-1 flex flex-col justify-center px-6 pb-10">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">
            Who do you want to work with?
          </h1>
          <p className="text-base text-gray-500 mb-8">
            Same great coaching — just pick whoever you vibe with.
          </p>

          <div className="grid grid-cols-2 gap-4">
            {(Object.entries(AVATARS) as [CoachAvatar, typeof AVATARS[CoachAvatar]][]).map(
              ([key, avatar]) => (
                <button
                  key={key}
                  onClick={() => setSelectedAvatar(key)}
                  className="flex flex-col items-center text-center bg-white rounded-2xl border-2 border-gray-100 p-5 gap-3 hover:border-emerald-400 hover:shadow-md active:scale-95 transition-all duration-150"
                >
                  <CoachPhoto avatar={key} size={80} />
                  <p className="text-base font-bold text-gray-800">{avatar.name}</p>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Chat ───────────────────────────────────────────────────────────────────
  const avatar = AVATARS[selectedAvatar];

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-white flex flex-col">
      <header className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-white/80">
        <div className="flex items-center gap-3">
          <CoachPhoto avatar={selectedAvatar} size={38} />
          <div>
            <p className="text-base font-bold text-gray-800 leading-none">{avatar.name}</p>
            <p className="text-sm text-gray-400">{avatar.tagline}</p>
          </div>
        </div>
        <button
          onClick={() => { if (confirm("Reset and start over?")) { localStorage.clear(); window.location.reload(); } }}
          className="text-xs text-gray-300 hover:text-red-400 transition-colors"
        >
          Reset
        </button>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-5 max-w-2xl mx-auto w-full space-y-5">
        {displayMessages.map((msg, i) => (
          <MessageBubble key={i} message={msg} coachAvatar={selectedAvatar} />
        ))}

        {streamingText && (
          <MessageBubble
            message={{ role: "assistant", content: streamingText, timestamp: new Date().toISOString() }}
            coachAvatar={selectedAvatar}
            isStreaming
          />
        )}

        {isLoading && !streamingText && (
          <div className="flex gap-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-lg">
              {avatar.emoji}
            </div>
            <div className="bg-white border border-gray-100 rounded-2xl rounded-tl-sm shadow-sm px-4 py-3">
              <div className="flex gap-1.5 items-center h-5">
                <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 rounded-full bg-gray-300 animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-gray-100 bg-white px-4 pt-3 pb-6">
        {isListening && (
          <div className="flex items-center justify-center gap-2 mb-3">
            <span className="text-base text-red-500 font-medium animate-pulse">Listening…</span>
            {interimText && (
              <span className="text-base text-gray-500 italic truncate max-w-[220px]">
                &ldquo;{interimText}&rdquo;
              </span>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mb-3">
          <div className="flex gap-2 items-end max-w-2xl mx-auto">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Or type your answer…"
              rows={1}
              className="flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-3 text-lg text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent max-h-36 overflow-y-auto"
              style={{ minHeight: "52px" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = Math.min(el.scrollHeight, 144) + "px";
              }}
            />
            {input.trim() && (
              <button
                type="submit"
                disabled={isLoading}
                className="shrink-0 w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center disabled:opacity-40 hover:bg-emerald-600 transition-colors"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            )}
          </div>
        </form>

        <div className="flex justify-center">
          <button
            onClick={toggle}
            disabled={isLoading}
            aria-label={isListening ? "Stop listening" : "Start voice input"}
            className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-40 shadow-lg active:scale-95
              ${isListening ? "bg-red-500 hover:bg-red-600" : "bg-emerald-500 hover:bg-emerald-600"}`}
          >
            {isListening && (
              <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40" />
            )}
            {isListening ? (
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            ) : (
              <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
