import type { UserProfile, DailyLogs, DayLog, FoodEntry, ChatMessage } from "./types";

const KEYS = {
  profile: "arc_profile",
  logs: "arc_logs",
  chat: "arc_chat_history",
} as const;

// ─── User Profile ────────────────────────────────────────────────────────────

export function getProfile(): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(KEYS.profile);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: UserProfile): void {
  localStorage.setItem(KEYS.profile, JSON.stringify(profile));
}

export function updateProfile(updates: Partial<UserProfile>): void {
  const existing = getProfile();
  if (!existing) return;
  saveProfile({ ...existing, ...updates });
}

// ─── Daily Logs ──────────────────────────────────────────────────────────────

export function getAllLogs(): DailyLogs {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEYS.logs);
    return raw ? (JSON.parse(raw) as DailyLogs) : {};
  } catch {
    return {};
  }
}

export function getLog(date: string): DayLog {
  const logs = getAllLogs();
  return logs[date] ?? { entries: [], totalCalories: 0, totalProtein: 0 };
}

function saveAllLogs(logs: DailyLogs): void {
  localStorage.setItem(KEYS.logs, JSON.stringify(logs));
}

function recalcTotals(log: DayLog): DayLog {
  const totalCalories = log.entries.reduce((s, e) => s + e.estimatedCalories, 0);
  const totalProtein = log.entries.reduce((s, e) => s + e.estimatedProtein, 0);
  return { ...log, totalCalories, totalProtein };
}

export function addFoodEntry(date: string, entry: FoodEntry): void {
  const logs = getAllLogs();
  const day = logs[date] ?? { entries: [], totalCalories: 0, totalProtein: 0 };
  day.entries = [...day.entries, entry];
  logs[date] = recalcTotals(day);
  saveAllLogs(logs);
}

export function correctFoodEntry(
  date: string,
  entryId: string,
  updates: Partial<FoodEntry>
): void {
  const logs = getAllLogs();
  const day = logs[date];
  if (!day) return;
  day.entries = day.entries.map((e) =>
    e.id === entryId ? { ...e, ...updates, corrected: true } : e
  );
  logs[date] = recalcTotals(day);
  saveAllLogs(logs);
}

export function deleteFoodEntry(date: string, entryId: string): void {
  const logs = getAllLogs();
  const day = logs[date];
  if (!day) return;
  day.entries = day.entries.filter((e) => e.id !== entryId);
  logs[date] = recalcTotals(day);
  saveAllLogs(logs);
}

export function logWeight(date: string, weightKg: number): void {
  const logs = getAllLogs();
  const day = logs[date] ?? { entries: [], totalCalories: 0, totalProtein: 0 };
  day.weightKg = weightKg;
  logs[date] = day;
  saveAllLogs(logs);
}

export function setAiReflection(date: string, reflection: string): void {
  const logs = getAllLogs();
  const day = logs[date] ?? { entries: [], totalCalories: 0, totalProtein: 0 };
  day.aiReflection = reflection;
  logs[date] = day;
  saveAllLogs(logs);
}

// ─── Chat History ─────────────────────────────────────────────────────────────

export function getChatHistory(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.chat);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

export function appendChatMessage(msg: ChatMessage): void {
  const history = getChatHistory();
  history.push(msg);
  // Keep last 100 messages
  const trimmed = history.slice(-100);
  localStorage.setItem(KEYS.chat, JSON.stringify(trimmed));
}

export function saveChatHistory(messages: ChatMessage[]): void {
  const trimmed = messages.slice(-100);
  localStorage.setItem(KEYS.chat, JSON.stringify(trimmed));
}

export function clearChatHistory(): void {
  localStorage.removeItem(KEYS.chat);
}

// ─── Dev utility ─────────────────────────────────────────────────────────────

export function clearAllData(): void {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}
