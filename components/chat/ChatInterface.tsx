"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { MessageBubble } from "./MessageBubble";
import { MacroSidebar } from "./MacroSidebar";
import type { UserProfile, DailyLogs, ChatMessage } from "@/lib/types";
import type { Trajectory } from "@/lib/calories";
import { computeTrajectory, todayStr } from "@/lib/calories";
import {
  getLog,
  getAllLogs,
  addFoodEntry,
  correctFoodEntry,
  deleteFoodEntry,
  logWeight,
  saveChatHistory,
  updateProfile,
} from "@/lib/storage";
import { v4 as uuid } from "uuid";
import { AVATARS } from "@/lib/types";

interface Props {
  profile: UserProfile;
  initialMessages: ChatMessage[];
}

export function ChatInterface({ profile, initialMessages }: Props) {
  const [logs, setLogs] = useState<DailyLogs>(() => getAllLogs());
  const [todayLog, setTodayLog] = useState(() => getLog(todayStr()));
  const [trajectory, setTrajectory] = useState<Trajectory>(() =>
    computeTrajectory(getAllLogs(), profile)
  );
  const [input, setInput] = useState("");
  const [interimText, setInterimText] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const avatar = AVATARS[profile.coachAvatar];

  const refreshLog = useCallback(() => {
    const allLogs = getAllLogs();
    setLogs(allLogs);
    setTodayLog(getLog(todayStr()));
    setTrajectory(computeTrajectory(allLogs, profile));
  }, [profile]);

  const handleToolCall = useCallback(
    (name: string, input: Record<string, unknown>) => {
      const today = todayStr();

      if (name === "log_food") {
        const date = (input.date as string) || today;
        const time = (input.time as string) || new Date().toTimeString().slice(0, 5);
        const timestamp = `${date}T${time}:00`;
        addFoodEntry(date, {
          id: uuid(),
          timestamp,
          description: input.description as string,
          estimatedCalories: input.estimated_calories as number,
          estimatedProtein: input.estimated_protein as number,
        });
        refreshLog();
      } else if (name === "correct_food_entry") {
        correctFoodEntry(input.date as string, input.entry_id as string, {
          description: input.updated_description as string | undefined,
          estimatedCalories: input.updated_calories as number | undefined,
          estimatedProtein: input.updated_protein as number | undefined,
        });
        refreshLog();
      } else if (name === "delete_food_entry") {
        deleteFoodEntry(input.date as string, input.entry_id as string);
        refreshLog();
      } else if (name === "log_weight") {
        logWeight((input.date as string) || today, input.weight_kg as number);
        refreshLog();
      } else if (name === "update_coach_style") {
        const field = input.field as string;
        const value = input.value;
        const current = profile.coachStyle;
        if (field === "observations" && typeof value === "string") {
          updateProfile({ coachStyle: { ...current, observations: [...current.observations, value] } });
        } else if (field === "supportLevel" || field === "techDepth") {
          updateProfile({ coachStyle: { ...current, [field]: value as number } });
        } else if (field === "checkInStyle") {
          updateProfile({ coachStyle: { ...current, checkInStyle: value as "brief" | "conversational" } });
        }
      }
    },
    [profile, refreshLog]
  );

  const { messages, streamingText, isLoading, sendMessage, setMessages } =
    useStreamingChat({
      endpoint: "/api/chat",
      getBody: (msgs) => ({ messages: msgs, profile, logs }),
      onToolCall: handleToolCall,
      onDone: (finalMessages) => saveChatHistory(finalMessages),
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

  // Load initial messages
  useEffect(() => {
    setMessages(initialMessages);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-gray-100 overflow-y-auto">
        <div className="p-4 border-b border-gray-100">
          <span className="text-xl font-bold text-emerald-600">Youly</span>
          <span className="ml-2 text-base text-gray-400">with {avatar.name}</span>
        </div>
        <MacroSidebar profile={profile} todayLog={todayLog} trajectory={trajectory} />
        <div className="mt-auto p-4 border-t border-gray-100">
          <a href="/progress" className="block text-center text-sm text-emerald-600 hover:underline">
            View progress →
          </a>
        </div>
      </aside>

      {/* Chat area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-gray-100">
          <span className="text-lg font-bold text-emerald-600">Youly</span>
          <a href="/progress" className="text-sm text-emerald-600">Progress →</a>
        </header>

        {/* Mobile macro strip */}
        <div className="md:hidden flex gap-5 items-center px-4 py-2.5 bg-white border-b border-gray-100 text-base text-gray-600">
          <span>🔥 <strong>{todayLog.totalCalories}</strong>/{profile.dailyCalorieTarget} kcal</span>
          <span>💪 <strong>{todayLog.totalProtein}</strong>/{profile.dailyProteinTarget}g</span>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
          {messages.length === 0 && !streamingText && (
            <div className="text-center text-gray-400 mt-16">
              <div className="text-5xl mb-3">{avatar.emoji}</div>
              <p className="text-lg">{avatar.name} is ready.<br />Tap the mic and start talking.</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble key={i} message={msg} coachAvatar={profile.coachAvatar} />
          ))}

          {streamingText && (
            <MessageBubble
              message={{ role: "assistant", content: streamingText, timestamp: new Date().toISOString() }}
              coachAvatar={profile.coachAvatar}
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

        {/* Input area */}
        <div className="bg-white border-t border-gray-100 px-4 pt-3 pb-5">
          {/* Listening indicator */}
          {isListening && (
            <div className="flex items-center justify-center gap-2 mb-3">
              <span className="text-base text-red-500 font-medium animate-pulse">
                Listening…
              </span>
              {interimText && (
                <span className="text-base text-gray-500 italic truncate max-w-[200px]">
                  &ldquo;{interimText}&rdquo;
                </span>
              )}
            </div>
          )}

          {/* Text input */}
          <form onSubmit={handleSubmit} className="mb-3">
            <div className="flex gap-2 items-end max-w-3xl mx-auto">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Or type here…"
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

          {/* Mic button — primary CTA */}
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
      </main>
    </div>
  );
}
