"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { MessageBubble } from "./MessageBubble";
import { MacroSidebar } from "./MacroSidebar";
import { FirstRunTour } from "./FirstRunTour";
import type { UserProfile, DailyLogs, ChatMessage, FoodEntry, MealType } from "@/lib/types";
import type { Trajectory } from "@/lib/calories";
import { computeTrajectory, todayStr } from "@/lib/calories";
import {
  getAllLogs,
  addFoodEntry,
  correctFoodEntry,
  deleteFoodEntry,
  logWeight,
  saveChatHistory,
  getChatHistory,
  getAvailableChatDates,
  updateProfile,
  clearAllData,
  deleteCloudBackups,
} from "@/lib/storage";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import { v4 as uuid } from "uuid";
import { AVATARS } from "@/lib/types";
import { CoachPhoto } from "@/components/shared/CoachPhoto";

const MEAL_ORDER: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

function formatNavDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatBannerDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

interface Props {
  profile: UserProfile;
  initialMessages: ChatMessage[];
  uid?: string;
}

export function ChatInterface({ profile, initialMessages, uid }: Props) {
  const [logs, setLogs] = useState<DailyLogs>(() => getAllLogs(uid));
  const [trajectory, setTrajectory] = useState<Trajectory>(() =>
    computeTrajectory(getAllLogs(uid), profile)
  );

  // Derive todayLog and viewedLog from logs so they always stay in sync
  const todayLog = useMemo(() => logs[todayStr()] ?? { entries: [], totalCalories: 0, totalProtein: 0 }, [logs]);
  const [input, setInput] = useState("");
  const [interimText, setInterimText] = useState("");
  const [showInput, setShowInput] = useState(false);
  const [showTour, setShowTour] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("youly_tour_done") !== "1";
  });
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const [userEmail, setUserEmail] = useState<string>("");
  const [viewDate, setViewDate] = useState(todayStr());
  const [pastMessages, setPastMessages] = useState<ChatMessage[]>([]);
  const [showFoodLog, setShowFoodLog] = useState(false);
  const [editingEntry, setEditingEntry] = useState<{ date: string; entry: FoodEntry } | null>(null);
  const [editForm, setEditForm] = useState({ description: "", calories: "", protein: "" });
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied">("idle");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const avatar = AVATARS[profile.coachAvatar];

  const isViewingToday = viewDate === todayStr();

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data.user?.email) setUserEmail(data.user.email);
    });
  }, []);

  const refreshLog = useCallback(() => {
    const allLogs = getAllLogs(uid);
    setLogs(allLogs);
    setTrajectory(computeTrajectory(allLogs, profile));
  }, [profile, uid]);

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
          meal: input.meal as MealType | undefined,
        }, uid);
        refreshLog();
      } else if (name === "correct_food_entry") {
        correctFoodEntry(input.date as string, input.entry_id as string, {
          description: input.updated_description as string | undefined,
          estimatedCalories: input.updated_calories as number | undefined,
          estimatedProtein: input.updated_protein as number | undefined,
        }, uid);
        refreshLog();
      } else if (name === "delete_food_entry") {
        deleteFoodEntry(input.date as string, input.entry_id as string, uid);
        refreshLog();
      } else if (name === "log_weight") {
        logWeight((input.date as string) || today, input.weight_lbs as number, uid);
        refreshLog();
      } else if (name === "update_coach_style") {
        const field = input.field as string;
        const value = input.value;
        const current = profile.coachStyle;
        if (field === "observations" && typeof value === "string") {
          updateProfile({ coachStyle: { ...current, observations: [...current.observations, value] } }, uid);
        } else if (field === "supportLevel" || field === "techDepth") {
          updateProfile({ coachStyle: { ...current, [field]: value as number } }, uid);
        } else if (field === "checkInStyle") {
          updateProfile({ coachStyle: { ...current, checkInStyle: value as "brief" | "conversational" } }, uid);
        }
      }
    },
    [profile, refreshLog, uid]
  );

  const { messages, streamingText, isLoading, sendMessage, setMessages } =
    useStreamingChat({
      endpoint: "/api/chat",
      getBody: (msgs) => ({ messages: msgs, profile, logs, clientTime: new Date().toISOString() }),
      onToolCall: handleToolCall,
      onDone: (finalMessages) => saveChatHistory(finalMessages, uid, todayStr()),
    });

  const displayMessages = isViewingToday ? messages : pastMessages;

  useEffect(() => {
    if (!isViewingToday) {
      setPastMessages(getChatHistory(uid, viewDate));
    }
  }, [viewDate, isViewingToday, uid]);

  const availableDates = useMemo(() => {
    const saved = getAvailableChatDates(uid);
    const today = todayStr();
    if (!saved.includes(today) && messages.length > 0) {
      return [today, ...saved].sort().reverse();
    }
    return saved;
  }, [uid, messages.length]);

  const viewIdx = availableDates.indexOf(viewDate);
  const prevDate = viewIdx < availableDates.length - 1 ? availableDates[viewIdx + 1] : null;
  const nextDate = viewIdx > 0 ? availableDates[viewIdx - 1] : null;

  const viewedLog = useMemo(() => logs[viewDate] ?? { entries: [], totalCalories: 0, totalProtein: 0 }, [logs, viewDate]);

  const entriesByMeal = useMemo(() => {
    const groups: Partial<Record<MealType, FoodEntry[]>> = {};
    for (const entry of viewedLog.entries) {
      const meal = (entry.meal ?? "snack") as MealType;
      if (!groups[meal]) groups[meal] = [];
      groups[meal]!.push(entry);
    }
    return groups;
  }, [viewedLog]);

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

  useEffect(() => {
    setMessages(initialMessages);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages, streamingText]);

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    submitMessage(input);
  };

  const copyChat = () => {
    const header = `Youly Chat — ${viewDate}\n${"─".repeat(30)}\n\n`;
    const body = displayMessages
      .map(m => `${m.role === "user" ? "Me" : avatar.name}: ${m.content}`)
      .join("\n\n");
    navigator.clipboard.writeText(header + body).then(() => {
      setCopyStatus("copied");
      setTimeout(() => setCopyStatus("idle"), 1500);
    });
  };

  const openEdit = (entry: FoodEntry) => {
    setEditingEntry({ date: viewDate, entry });
    setEditForm({
      description: entry.description,
      calories: String(entry.estimatedCalories),
      protein: String(entry.estimatedProtein),
    });
  };

  const saveEdit = () => {
    if (!editingEntry) return;
    correctFoodEntry(editingEntry.date, editingEntry.entry.id, {
      description: editForm.description || undefined,
      estimatedCalories: editForm.calories ? Number(editForm.calories) : undefined,
      estimatedProtein: editForm.protein ? Number(editForm.protein) : undefined,
    }, uid);
    refreshLog();
    setEditingEntry(null);
  };

  return (
    <div className="flex h-screen bg-gray-50 relative">
      {/* Sidebar — desktop only */}
      <aside className="hidden md:flex flex-col w-72 bg-white border-r border-gray-100 overflow-y-auto">
        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <CoachPhoto avatar={profile.coachAvatar} size={36} />
          <div>
            <p className="text-base font-black tracking-tight uppercase text-emerald-600">Youly</p>
            <p className="text-xs text-gray-400">with {avatar.name}</p>
          </div>
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
          <span className="text-lg font-black tracking-tight uppercase text-emerald-600">Youly</span>
          <div className="flex items-center gap-4">
            <a href="/progress" className="text-sm text-emerald-600">Progress →</a>
            <button
              onClick={() => setShowAccountMenu(true)}
              className="w-8 h-8 rounded-full bg-emerald-500 text-white text-sm font-bold flex items-center justify-center"
              aria-label="Account menu"
            >
              {profile.name?.charAt(0).toUpperCase() ?? "?"}
            </button>
          </div>
        </header>

        {/* Mobile macro strip */}
        <div className="md:hidden bg-white border-b border-gray-100 px-4 pt-2 pb-3">
          {/* Date navigation */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => prevDate && setViewDate(prevDate)}
              disabled={!prevDate}
              className="w-7 h-7 flex items-center justify-center text-gray-400 disabled:opacity-30"
              aria-label="Previous day"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6z"/>
              </svg>
            </button>
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                {isViewingToday ? `${formatNavDate(viewDate)} — Today` : formatNavDate(viewDate)}
              </p>
              {!isViewingToday && (
                <button
                  onClick={() => setViewDate(todayStr())}
                  className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 rounded-full px-2 py-0.5"
                >
                  Today →
                </button>
              )}
            </div>
            <button
              onClick={() => nextDate && setViewDate(nextDate)}
              disabled={!nextDate}
              className="w-7 h-7 flex items-center justify-center text-gray-400 disabled:opacity-30"
              aria-label="Next day"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6z"/>
              </svg>
            </button>
          </div>

          <div className="flex gap-4 items-start">
            {/* Calories */}
            <div className="flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-600 mb-0.5">Calories</p>
              <div className="flex items-baseline gap-1.5">
                <span
                  className="font-bold text-gray-900 tabular-nums leading-none"
                  style={{ fontFamily: "var(--font-dm-sans)", fontSize: "2rem" }}
                >
                  {viewedLog.totalCalories}
                </span>
                <span className="text-sm font-semibold text-gray-400">/ {profile.dailyCalorieTarget} kcal</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${viewedLog.totalCalories > profile.dailyCalorieTarget ? "bg-orange-400" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(viewedLog.totalCalories / profile.dailyCalorieTarget, 1) * 100}%` }}
                />
              </div>
            </div>
            <div className="w-px h-10 bg-gray-100 self-center" />
            {/* Protein */}
            <div className="flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-blue-600 mb-0.5">Protein</p>
              <div className="flex items-baseline gap-1.5">
                <span
                  className="font-bold text-gray-900 tabular-nums leading-none"
                  style={{ fontFamily: "var(--font-dm-sans)", fontSize: "2rem" }}
                >
                  {viewedLog.totalProtein}
                </span>
                <span className="text-sm font-semibold text-gray-400">/ {profile.dailyProteinTarget}g</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${viewedLog.totalProtein > profile.dailyProteinTarget ? "bg-orange-400" : "bg-blue-500"}`}
                  style={{ width: `${Math.min(viewedLog.totalProtein / profile.dailyProteinTarget, 1) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Food log toggle */}
          {viewedLog.entries.length > 0 && (
            <button
              onClick={() => setShowFoodLog(v => !v)}
              className="w-full mt-2 text-[11px] font-semibold text-gray-400 flex items-center justify-center gap-1"
            >
              {showFoodLog ? "▲ Hide food log" : `▼ ${viewedLog.entries.length} item${viewedLog.entries.length === 1 ? "" : "s"} logged`}
            </button>
          )}

          {/* Food log panel */}
          {showFoodLog && viewedLog.entries.length > 0 && (
            <div className="mt-2 border-t border-gray-100 pt-2 space-y-3">
              {MEAL_ORDER.filter(m => entriesByMeal[m]?.length).map(meal => (
                <div key={meal}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{MEAL_LABELS[meal]}</p>
                    <p className="text-[11px] text-gray-400">
                      {entriesByMeal[meal]!.reduce((s, e) => s + e.estimatedCalories, 0)} kcal
                    </p>
                  </div>
                  {entriesByMeal[meal]!.map(entry => (
                    <div key={entry.id} className="flex items-start justify-between py-1.5 border-b border-gray-50 last:border-0">
                      <div className="flex-1 min-w-0 pr-2">
                        <p className="text-sm text-gray-700 leading-snug">{entry.description}</p>
                        <p className="text-[11px] text-gray-400">{entry.estimatedCalories} kcal · {entry.estimatedProtein}g protein</p>
                      </div>
                      {isViewingToday && (
                        <div className="flex gap-1 shrink-0">
                          <button
                            onClick={() => openEdit(entry)}
                            className="text-[11px] text-emerald-600 font-medium px-2 py-0.5 rounded-lg bg-emerald-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => { deleteFoodEntry(todayStr(), entry.id, uid); refreshLog(); }}
                            className="text-[11px] text-red-400 font-medium px-2 py-0.5 rounded-lg bg-red-50"
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Past-day banner */}
        {!isViewingToday && (
          <div className="md:hidden bg-amber-50 border-b border-amber-100 px-4 py-2 flex items-center justify-between">
            <p className="text-xs text-amber-700">Viewing {formatBannerDate(viewDate)} — read only</p>
            <button
              onClick={() => setViewDate(todayStr())}
              className="text-xs font-semibold text-emerald-600"
            >
              Today →
            </button>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
          {displayMessages.length === 0 && !streamingText && (
            <div className="text-center text-gray-400 mt-16 flex flex-col items-center gap-3 px-6">
              <CoachPhoto avatar={profile.coachAvatar} size={72} />
              <div>
                <p className="text-lg font-semibold text-gray-700">{avatar.name} is ready</p>
                <p className="text-sm text-gray-400 mt-1 leading-relaxed">
                  Tell me what you&apos;re eating today and I&apos;ll track your calories and protein automatically.
                  <br />Tap the mic and just start talking.
                </p>
              </div>
            </div>
          )}

          {displayMessages.map((msg, i) => (
            <MessageBubble key={i} message={msg} coachAvatar={profile.coachAvatar} />
          ))}

          {isViewingToday && streamingText && (
            <MessageBubble
              message={{ role: "assistant", content: streamingText, timestamp: new Date().toISOString() }}
              coachAvatar={profile.coachAvatar}
              isStreaming
            />
          )}

          {isViewingToday && isLoading && !streamingText && (
            <div className="flex gap-3">
              <CoachPhoto avatar={profile.coachAvatar} size={36} className="mt-0.5" />
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

        {/* Input area — hidden when viewing a past day */}
        {isViewingToday && (
          <div className="bg-white border-t border-gray-100 px-4 pt-2 pb-4">
            {isListening && (
              <div className="flex items-center justify-center gap-2 mb-2">
                <span className="text-sm text-red-500 font-medium animate-pulse">Listening…</span>
                {interimText && (
                  <span className="text-sm text-gray-400 italic truncate max-w-[200px]">
                    &ldquo;{interimText}&rdquo;
                  </span>
                )}
              </div>
            )}

            {showInput && (
              <form onSubmit={(e) => { handleSubmit(e); setShowInput(false); }} className="mb-2">
                <div className="flex gap-2 items-end max-w-3xl mx-auto">
                  <textarea
                    ref={inputRef}
                    autoFocus
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSubmit(); setShowInput(false); } }}
                    placeholder="Type here…"
                    rows={1}
                    className="flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-3 text-base text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-transparent max-h-32 overflow-y-auto"
                    style={{ minHeight: "48px" }}
                    onInput={(e) => {
                      const el = e.currentTarget;
                      el.style.height = "auto";
                      el.style.height = Math.min(el.scrollHeight, 128) + "px";
                    }}
                  />
                  {input.trim() ? (
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="shrink-0 w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center disabled:opacity-40"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                      </svg>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowInput(false)}
                      className="shrink-0 w-11 h-11 rounded-2xl bg-gray-100 text-gray-400 flex items-center justify-center"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                      </svg>
                    </button>
                  )}
                </div>
              </form>
            )}

            <div className="flex items-center justify-center gap-6">
              <button
                onClick={() => setShowInput((v) => !v)}
                disabled={isLoading}
                aria-label="Type a message"
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${showInput ? "bg-emerald-100 text-emerald-600" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20 5H4c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-9 3h2v2h-2V8zm0 3h2v2h-2v-2zM8 8h2v2H8V8zm0 3h2v2H8v-2zm-1 5H5v-2h2v2zm10 0H7v-2h10v2zm0-3h-2v-2h2v2zm0-3h-2V8h2v2zm3 6h-2v-2h2v2z"/>
                </svg>
              </button>

              <button
                onClick={toggle}
                disabled={isLoading}
                aria-label={isListening ? "Stop listening" : "Start voice input"}
                className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-40 shadow-lg active:scale-95
                  ${isListening ? "bg-red-500 hover:bg-red-600" : "bg-emerald-500 hover:bg-emerald-600"}`}
              >
                {isListening && (
                  <span className="absolute inset-0 rounded-full bg-red-400 animate-ping opacity-40" />
                )}
                {isListening ? (
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="6" width="12" height="12" rx="2" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z" />
                  </svg>
                )}
              </button>

              <div className="w-11" />
            </div>
          </div>
        )}
      </main>

      {showTour && (
        <FirstRunTour
          coachName={avatar.name}
          onDone={() => {
            localStorage.setItem("youly_tour_done", "1");
            setShowTour(false);
          }}
        />
      )}

      {/* Account menu bottom drawer */}
      {showAccountMenu && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setShowAccountMenu(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl pb-10">
            <div className="flex justify-center pt-3 pb-4">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <div className="px-6 pb-4 border-b border-gray-100">
              <p className="font-semibold text-gray-800">{profile.name}</p>
              <p className="text-sm text-gray-400">{userEmail}</p>
            </div>
            <div className="px-6 pt-4 space-y-1">
              <button
                onClick={async () => {
                  setShowAccountMenu(false);
                  const supabase = createSupabaseBrowserClient();
                  await supabase.auth.signOut();
                  window.location.replace("/login");
                }}
                className="w-full text-left py-3 px-4 rounded-2xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Sign out
              </button>
              <button
                onClick={() => {
                  setShowAccountMenu(false);
                  copyChat();
                }}
                className="w-full text-left py-3 px-4 rounded-2xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                {copyStatus === "copied" ? "Copied! ✓" : "Copy chat transcript"}
              </button>
              <button
                onClick={async () => {
                  setShowAccountMenu(false);
                  if (!confirm("This will permanently erase all your data. Are you sure?")) return;
                  clearAllData(uid);
                  if (uid) await deleteCloudBackups(uid);
                  localStorage.removeItem("arc_intro_done");
                  localStorage.removeItem("arc_consent_done");
                  localStorage.removeItem("youly_tour_done");
                  const supabase = createSupabaseBrowserClient();
                  await supabase.auth.signOut();
                  window.location.replace("/intro");
                }}
                className="w-full text-left py-3 px-4 rounded-2xl text-red-400 text-sm hover:bg-red-50 transition-colors"
              >
                Reset my data
              </button>
            </div>
          </div>
        </>
      )}

      {/* Inline food entry edit sheet */}
      {editingEntry && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setEditingEntry(null)} />
          <div className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-3xl shadow-2xl pb-10 px-6 pt-6">
            <div className="flex justify-center mb-4">
              <div className="w-10 h-1 rounded-full bg-gray-200" />
            </div>
            <p className="font-semibold text-gray-800 mb-4">Edit entry</p>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</label>
                <input
                  className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  value={editForm.description}
                  onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Calories</label>
                  <input
                    type="number"
                    className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    value={editForm.calories}
                    onChange={e => setEditForm(f => ({ ...f, calories: e.target.value }))}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Protein (g)</label>
                  <input
                    type="number"
                    className="w-full mt-1 rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    value={editForm.protein}
                    onChange={e => setEditForm(f => ({ ...f, protein: e.target.value }))}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setEditingEntry(null)}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-gray-500 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="flex-1 py-3 rounded-2xl bg-emerald-500 text-white font-semibold"
              >
                Save
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
