"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { useStreamingChat, type ChatImage } from "@/hooks/useStreamingChat";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { MessageBubble } from "./MessageBubble";
import { MacroPanel } from "./MacroPanel";
import { Composer } from "./Composer";
import { FirstRunTour } from "./FirstRunTour";
import type { UserProfile, DailyLogs, ChatMessage, FoodEntry, MealType } from "@/lib/types";
import type { Trajectory } from "@/lib/calories";
import { computeTrajectory, todayStr, daysBetween } from "@/lib/calories";
import { getAllLogs, saveChatHistory, getChatHistory } from "@/lib/storage";
import { loadChatHistoryDb, loadChatDatesDb, saveChatHistoryDb } from "@/lib/chat-db";
import { loadLogs, correctFoodEntryDb, deleteFoodEntryDb } from "@/lib/db";
import { v4 as uuid } from "uuid";
import { AVATARS } from "@/lib/types";
import { CoachPhoto } from "@/components/shared/CoachPhoto";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { IconButton } from "@/components/ui/IconButton";
import { Icon } from "@/components/ui/Icon";
import { ProgressBar } from "@/components/ui/Metric";
import { TypingDots } from "@/components/ui/Feedback";

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

// Downscale a label photo to a legible-but-small JPEG so the payload + vision tokens stay reasonable.
async function fileToResizedImage(file: File): Promise<ChatImage> {
  const dataUrl: string = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read failed"));
    reader.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error("decode failed"));
    im.src = dataUrl;
  });
  const maxEdge = 1280; // enough to keep small label text readable
  const scale = Math.min(1, maxEdge / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { data: dataUrl.split(",")[1] ?? "", mediaType: "image/jpeg" };
  ctx.drawImage(img, 0, 0, w, h);
  const out = canvas.toDataURL("image/jpeg", 0.82);
  return { data: out.split(",")[1] ?? "", mediaType: "image/jpeg" };
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
  const [showTour, setShowTour] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem("youly_tour_done") !== "1";
  });
  const [viewDate, setViewDate] = useState(todayStr());
  const [pastMessages, setPastMessages] = useState<ChatMessage[]>([]);
  // Days with stored history. Sourced from the DB so it survives a localStorage wipe.
  const [chatDates, setChatDates] = useState<string[]>([]);
  const [showFoodLog, setShowFoodLog] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<{ date: string; entry: FoodEntry } | null>(null);
  const [editForm, setEditForm] = useState({ description: "", calories: "", protein: "" });
  const bottomRef = useRef<HTMLDivElement>(null);
  const avatar = AVATARS[profile.coachAvatar];

  const isViewingToday = viewDate === todayStr();
  const isEditable = daysBetween(viewDate) <= 3;

  const refreshLog = useCallback(async () => {
    // DB is the source of truth; fall back to the local cache if we have no uid.
    const allLogs = uid ? await loadLogs(uid) : getAllLogs(uid);
    setLogs(allLogs);
    setTrajectory(computeTrajectory(allLogs, profile));
  }, [profile, uid]);

  // Always-fresh ref so stale closures (onDone, onRefresh) call the latest refreshLog.
  // The cache-first paint is reconciled with the DB by the !isLoading effect below
  // (which runs on mount since isLoading starts false).
  const refreshLogRef = useRef(refreshLog);
  useEffect(() => {
    refreshLogRef.current = refreshLog;
  }, [refreshLog]);

  // Auto-update trajectory whenever logs change
  useEffect(() => {
    setTrajectory(computeTrajectory(logs, profile));
  }, [logs, profile]);

  // The server now executes all tools against the DB and signals a `refresh` when
  // anything changed. Here we only do a lightweight optimistic macro bump for
  // log_food so the strip moves instantly; refresh reconciles with DB truth.
  const handleToolCall = useCallback(
    (name: string, input: Record<string, unknown>) => {
      if (name !== "log_food") return;
      const today = todayStr();
      const aiDate = (input.date as string) || today;
      const date = aiDate > today ? today : aiDate;
      const time = (input.time as string) || new Date().toTimeString().slice(0, 5);
      const optimistic: FoodEntry = {
        id: uuid(),
        timestamp: `${date}T${time}:00`,
        description: input.description as string,
        estimatedCalories: (input.estimated_calories as number) ?? 0,
        estimatedProtein: (input.estimated_protein as number) ?? 0,
        meal: input.meal as MealType | undefined,
      };
      setLogs(prev => {
        const day = prev[date] ?? { entries: [], totalCalories: 0, totalProtein: 0 };
        const entries = [...day.entries, optimistic];
        return {
          ...prev,
          [date]: {
            ...day,
            entries,
            totalCalories: entries.reduce((s, e) => s + e.estimatedCalories, 0),
            totalProtein: entries.reduce((s, e) => s + e.estimatedProtein, 0),
          },
        };
      });
    },
    []
  );

  const { messages, streamingText, isLoading, sendMessage, setMessages } =
    useStreamingChat({
      endpoint: "/api/chat",
      getBody: (msgs, image) => {
        const now = new Date();
        // profile and logs are deliberately NOT sent — /api/chat reads them under
        // RLS. The client owns only the message list and its own clock.
        return {
          messages: msgs,
          clientTime: now.toISOString(),
          clientDate: todayStr(),
          clientHour: now.getHours(),
          clientTimeDisplay: now.toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" }),
          image,
        };
      },
      onToolCall: handleToolCall,
      onRefresh: () => refreshLogRef.current(),
      onDone: (finalMessages) => {
        const today = todayStr();
        if (uid) {
          // Writes the local mirror first, then persists the day to the DB. A failed
          // write self-heals: the next turn re-sends the whole day.
          saveChatHistoryDb(uid, today, finalMessages);
        } else {
          saveChatHistory(finalMessages, uid, today);
        }
        setChatDates((prev) => (prev.includes(today) ? prev : [today, ...prev].sort().reverse()));
        refreshLogRef.current();
      },
    });

  const displayMessages = isViewingToday ? messages : pastMessages;

  // Refresh log state whenever a request finishes — catches cases where
  // the onToolCall callback chain doesn't fire (e.g. AI responds without tools).
  useEffect(() => {
    if (!isLoading) refreshLog();
  }, [isLoading]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (isViewingToday) return;
    let cancelled = false;
    // Paint the local mirror immediately, then reconcile with the DB.
    setPastMessages(getChatHistory(uid, viewDate));
    if (!uid) return;
    loadChatHistoryDb(uid, viewDate).then((msgs) => {
      if (!cancelled) setPastMessages(msgs);
    });
    return () => {
      cancelled = true;
    };
  }, [viewDate, isViewingToday, uid]);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    loadChatDatesDb(uid).then((dates) => {
      if (!cancelled) setChatDates(dates);
    });
    return () => {
      cancelled = true;
    };
  }, [uid]);

  const availableDates = useMemo(() => {
    const today = todayStr();
    if (!chatDates.includes(today) && messages.length > 0) {
      return [today, ...chatDates].sort().reverse();
    }
    return chatDates;
  }, [chatDates, messages.length]);

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

  const handlePhotoFile = useCallback(
    async (file: File) => {
      if (isLoading) return;
      setPhotoError(null);
      try {
        const image = await fileToResizedImage(file);
        await sendMessage("", image);
      } catch {
        // Was an alert(), which can't be styled and can't be dismissed by keyboard.
        setPhotoError("We couldn't read that image. Try another photo.");
      }
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

  const openEdit = (entry: FoodEntry) => {
    setEditingEntry({ date: viewDate, entry });
    setEditForm({
      description: entry.description,
      calories: String(entry.estimatedCalories),
      protein: String(entry.estimatedProtein),
    });
  };

  const saveEdit = async () => {
    if (!editingEntry || !uid) { setEditingEntry(null); return; }
    await correctFoodEntryDb(uid, editingEntry.date, editingEntry.entry.id, {
      description: editForm.description || undefined,
      estimatedCalories: editForm.calories ? Number(editForm.calories) : undefined,
      estimatedProtein: editForm.protein ? Number(editForm.protein) : undefined,
    });
    await refreshLog();
    setEditingEntry(null);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col xl:flex-row">
      {/* Macro rail — xl and up, so it never competes with the app sidebar at lg. */}
      <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-border-subtle bg-surface xl:block">
        <div className="flex items-center gap-3 border-b border-border-subtle p-4">
          <CoachPhoto avatar={profile.coachAvatar} size={36} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-ink">{avatar.name}</p>
            <p className="text-xs text-ink-muted">Your coach</p>
          </div>
        </div>
        <MacroPanel profile={profile} todayLog={todayLog} trajectory={trajectory} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Day navigation + macro strip. Hidden at xl, where the rail covers it. */}
        <div className="shrink-0 border-b border-border-subtle bg-surface px-4 pb-3 pt-2 xl:hidden">
          <div className="mx-auto flex max-w-3xl items-center justify-between">
            <IconButton
              icon="chevron-left"
              label="Previous day"
              size={36}
              disabled={!prevDate}
              onClick={() => prevDate && setViewDate(prevDate)}
            />
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                {isViewingToday
                  ? `${formatNavDate(viewDate)} — Today`
                  : formatNavDate(viewDate)}
              </p>
              {!isViewingToday ? (
                <button
                  type="button"
                  onClick={() => setViewDate(todayStr())}
                  className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-800"
                >
                  Today
                </button>
              ) : null}
            </div>
            <IconButton
              icon="chevron-right"
              label="Next day"
              size={36}
              disabled={!nextDate}
              onClick={() => nextDate && setViewDate(nextDate)}
            />
          </div>

          <div className="mx-auto mt-1 grid max-w-3xl gap-4 sm:grid-cols-2">
            <ProgressBar
              label="Calories"
              value={viewedLog.totalCalories}
              target={profile.dailyCalorieTarget}
              unit="kcal"
              series="calories"
            />
            <ProgressBar
              label="Protein"
              value={viewedLog.totalProtein}
              target={profile.dailyProteinTarget}
              unit="g"
              series="protein"
            />
          </div>

          {viewedLog.entries.length > 0 ? (
            <div className="mx-auto mt-3 max-w-3xl border-t border-border-subtle pt-2">
              <button
                type="button"
                onClick={() => setShowFoodLog((v) => !v)}
                aria-expanded={showFoodLog}
                aria-controls="food-log-panel"
                className="flex w-full min-h-9 items-center justify-center gap-1.5 text-sm font-semibold text-ink-muted transition-colors hover:text-ink"
              >
                <Icon name={showFoodLog ? "chevron-up" : "chevron-down"} size={16} />
                {`${viewedLog.entries.length} item${viewedLog.entries.length === 1 ? "" : "s"} logged`}
              </button>

              {showFoodLog ? (
                <div id="food-log-panel" className="mt-2 space-y-4 border-t border-border-subtle pt-3">
                  {MEAL_ORDER.filter((m) => entriesByMeal[m]?.length).map((meal) => (
                    <div key={meal}>
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                          {MEAL_LABELS[meal]}
                        </p>
                        <p className="tnum text-xs text-ink-muted">
                          {entriesByMeal[meal]!.reduce((s, e) => s + e.estimatedCalories, 0)} kcal
                        </p>
                      </div>
                      <ul>
                        {entriesByMeal[meal]!.map((entry) => (
                          <li
                            key={entry.id}
                            className="flex items-start justify-between gap-2 border-b border-border-subtle py-2 last:border-0"
                          >
                            <div className="min-w-0 flex-1">
                              <p className="text-sm leading-snug text-ink-body">
                                {entry.description}
                              </p>
                              <p className="tnum text-xs text-ink-muted">
                                {entry.estimatedCalories} kcal · {entry.estimatedProtein}g protein
                              </p>
                            </div>
                            {isEditable ? (
                              <div className="flex shrink-0 gap-1">
                                <IconButton
                                  icon="pencil"
                                  label={`Edit ${entry.description}`}
                                  tone="brand"
                                  size={36}
                                  onClick={() => openEdit(entry)}
                                />
                                <IconButton
                                  icon="trash"
                                  label={`Delete ${entry.description}`}
                                  tone="danger"
                                  size={36}
                                  onClick={async () => {
                                    if (uid) await deleteFoodEntryDb(uid, viewDate, entry.id);
                                    await refreshLog();
                                  }}
                                />
                              </div>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        {!isViewingToday && !isEditable ? (
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-200 bg-amber-50 px-4 py-2">
            <p className="text-sm text-amber-900">
              Viewing {formatBannerDate(viewDate)} — read only
            </p>
            <button
              type="button"
              onClick={() => setViewDate(todayStr())}
              className="text-sm font-semibold text-brand-800"
            >
              Today
            </button>
          </div>
        ) : null}

        {/* Messages — the only scrolling region on this screen. */}
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6">
          <div className="mx-auto max-w-3xl space-y-5">
            {displayMessages.length === 0 && !streamingText ? (
              <div className="mt-12 flex flex-col items-center gap-3 px-6 text-center">
                <CoachPhoto avatar={profile.coachAvatar} size={72} />
                <div>
                  <p className="text-lg font-semibold text-ink">
                    {avatar.name} is ready
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                    Tell me what you&apos;re eating today and I&apos;ll track your
                    calories and protein automatically.
                    <br />
                    Tap the mic and just start talking.
                  </p>
                </div>
              </div>
            ) : null}

            {displayMessages.map((msg, i) => (
              <MessageBubble key={i} message={msg} coachAvatar={profile.coachAvatar} />
            ))}

            {/* Streaming replies are announced, not just painted. */}
            <div aria-live="polite" aria-atomic="false">
              {isEditable && streamingText ? (
                <MessageBubble
                  message={{
                    role: "assistant",
                    content: streamingText,
                    timestamp: new Date().toISOString(),
                  }}
                  coachAvatar={profile.coachAvatar}
                  isStreaming
                />
              ) : null}
            </div>

            {isEditable && isLoading && !streamingText ? (
              <div className="flex gap-3">
                <CoachPhoto avatar={profile.coachAvatar} size={36} className="mt-0.5" />
                <div className="flex h-11 items-center rounded-2xl rounded-tl-sm border border-border-subtle bg-surface px-4 shadow-card">
                  <TypingDots label={`${avatar.name} is typing`} />
                </div>
              </div>
            ) : null}

            <div ref={bottomRef} />
          </div>
        </div>

        {photoError ? (
          <div className="shrink-0 border-t border-danger/20 bg-danger-soft px-4 py-2">
            <p role="alert" className="text-sm font-medium text-danger">
              {photoError}
            </p>
          </div>
        ) : null}

        {isEditable ? (
          <div className="shrink-0">
            <Composer
              value={input}
              onChange={setInput}
              onSubmit={() => submitMessage(input)}
              isLoading={isLoading}
              isListening={isListening}
              interimText={interimText}
              onToggleMic={toggle}
              onPickImage={handlePhotoFile}
            />
          </div>
        ) : null}
      </div>

      {showTour ? (
        <FirstRunTour
          coachName={avatar.name}
          onDone={() => {
            localStorage.setItem("youly_tour_done", "1");
            setShowTour(false);
          }}
        />
      ) : null}

      {/* Entry edit — now a real dialog with a focus trap and Escape, and its
          three inputs are labelled. */}
      <Sheet
        open={editingEntry !== null}
        onClose={() => setEditingEntry(null)}
        title="Edit entry"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setEditingEntry(null)}>
              Cancel
            </Button>
            <Button fullWidth onClick={saveEdit}>
              Save
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Description">
            {(props) => (
              <Input
                {...props}
                value={editForm.description}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, description: e.target.value }))
                }
              />
            )}
          </Field>
          <div className="flex gap-3">
            <div className="flex-1">
              <Field label="Calories">
                {(props) => (
                  <Input
                    {...props}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={editForm.calories}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, calories: e.target.value }))
                    }
                  />
                )}
              </Field>
            </div>
            <div className="flex-1">
              <Field label="Protein (g)">
                {(props) => (
                  <Input
                    {...props}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={editForm.protein}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, protein: e.target.value }))
                    }
                  />
                )}
              </Field>
            </div>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
