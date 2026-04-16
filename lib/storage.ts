import type { UserProfile, DailyLogs, DayLog, FoodEntry, ChatMessage } from "./types";

// ─── Key helpers ──────────────────────────────────────────────────────────────

function keys(uid: string) {
  return {
    profile: `arc_profile_${uid}`,
    logs: `arc_logs_${uid}`,
    chat: `arc_chat_${uid}`,
    consent: `arc_consent_${uid}`,
  };
}

// Legacy keys (pre-auth, used as fallback during transition)
const LEGACY_KEYS = {
  profile: "arc_profile",
  logs: "arc_logs",
  chat: "arc_chat_history",
} as const;

// ─── User Profile ────────────────────────────────────────────────────────────

export function getProfile(uid?: string): UserProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const key = uid ? keys(uid).profile : LEGACY_KEYS.profile;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: UserProfile, uid?: string): void {
  const key = uid ? keys(uid).profile : LEGACY_KEYS.profile;
  localStorage.setItem(key, JSON.stringify(profile));
}

export function updateProfile(updates: Partial<UserProfile>, uid?: string): void {
  const existing = getProfile(uid);
  if (!existing) return;
  saveProfile({ ...existing, ...updates }, uid);
}

// ─── Daily Logs ──────────────────────────────────────────────────────────────

export function getAllLogs(uid?: string): DailyLogs {
  if (typeof window === "undefined") return {};
  try {
    const key = uid ? keys(uid).logs : LEGACY_KEYS.logs;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as DailyLogs) : {};
  } catch {
    return {};
  }
}

export function getLog(date: string, uid?: string): DayLog {
  const logs = getAllLogs(uid);
  return logs[date] ?? { entries: [], totalCalories: 0, totalProtein: 0 };
}

function saveAllLogs(logs: DailyLogs, uid?: string): void {
  const key = uid ? keys(uid).logs : LEGACY_KEYS.logs;
  localStorage.setItem(key, JSON.stringify(logs));
}

function recalcTotals(log: DayLog): DayLog {
  const totalCalories = log.entries.reduce((s, e) => s + e.estimatedCalories, 0);
  const totalProtein = log.entries.reduce((s, e) => s + e.estimatedProtein, 0);
  return { ...log, totalCalories, totalProtein };
}

export function addFoodEntry(date: string, entry: FoodEntry, uid?: string): void {
  const logs = getAllLogs(uid);
  const day = logs[date] ?? { entries: [], totalCalories: 0, totalProtein: 0 };
  day.entries = [...day.entries, entry];
  logs[date] = recalcTotals(day);
  saveAllLogs(logs, uid);
}

export function correctFoodEntry(
  date: string,
  entryId: string,
  updates: Partial<FoodEntry>,
  uid?: string
): void {
  const logs = getAllLogs(uid);
  const day = logs[date];
  if (!day) return;
  day.entries = day.entries.map((e) =>
    e.id === entryId ? { ...e, ...updates, corrected: true } : e
  );
  logs[date] = recalcTotals(day);
  saveAllLogs(logs, uid);
}

export function deleteFoodEntry(date: string, entryId: string, uid?: string): void {
  const logs = getAllLogs(uid);
  const day = logs[date];
  if (!day) return;
  day.entries = day.entries.filter((e) => e.id !== entryId);
  logs[date] = recalcTotals(day);
  saveAllLogs(logs, uid);
}

export function logWeight(date: string, weightLbs: number, uid?: string): void {
  const logs = getAllLogs(uid);
  const day = logs[date] ?? { entries: [], totalCalories: 0, totalProtein: 0 };
  day.weightLbs = weightLbs;
  logs[date] = day;
  saveAllLogs(logs, uid);
}

export function setAiReflection(date: string, reflection: string, uid?: string): void {
  const logs = getAllLogs(uid);
  const day = logs[date] ?? { entries: [], totalCalories: 0, totalProtein: 0 };
  day.aiReflection = reflection;
  logs[date] = day;
  saveAllLogs(logs, uid);
}

// ─── Chat History ─────────────────────────────────────────────────────────────

export function getChatHistory(uid?: string): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const key = uid ? keys(uid).chat : LEGACY_KEYS.chat;
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as ChatMessage[]) : [];
  } catch {
    return [];
  }
}

export function appendChatMessage(msg: ChatMessage, uid?: string): void {
  const history = getChatHistory(uid);
  history.push(msg);
  const trimmed = history.slice(-100);
  const key = uid ? keys(uid).chat : LEGACY_KEYS.chat;
  localStorage.setItem(key, JSON.stringify(trimmed));
}

export function saveChatHistory(messages: ChatMessage[], uid?: string): void {
  const trimmed = messages.slice(-100);
  const key = uid ? keys(uid).chat : LEGACY_KEYS.chat;
  localStorage.setItem(key, JSON.stringify(trimmed));
}

export function clearChatHistory(uid?: string): void {
  const key = uid ? keys(uid).chat : LEGACY_KEYS.chat;
  localStorage.removeItem(key);
}

// ─── Consent ─────────────────────────────────────────────────────────────────

export function hasConsented(uid: string): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(keys(uid).consent) === "true";
}

// ─── Clear all data for a user ────────────────────────────────────────────────

export function clearAllData(uid?: string): void {
  if (uid) {
    const k = keys(uid);
    Object.values(k).forEach((key) => localStorage.removeItem(key));
  } else {
    Object.values(LEGACY_KEYS).forEach((k) => localStorage.removeItem(k));
  }
}

// ─── Cloud sync (fire-and-forget) ─────────────────────────────────────────────

export async function syncProfileToCloud(uid: string, profile: UserProfile): Promise<void> {
  try {
    const { createSupabaseBrowserClient } = await import("./supabase-browser");
    const supabase = createSupabaseBrowserClient();
    await supabase.from("profile_backups").upsert({
      user_id: uid,
      data: profile,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Sync failure is non-fatal — data is already saved locally
  }
}

export async function syncLogsToCloud(uid: string, logs: DailyLogs): Promise<void> {
  try {
    const { createSupabaseBrowserClient } = await import("./supabase-browser");
    const supabase = createSupabaseBrowserClient();
    await supabase.from("log_backups").upsert({
      user_id: uid,
      data: logs,
      updated_at: new Date().toISOString(),
    });
  } catch {
    // Sync failure is non-fatal
  }
}

export async function restoreFromCloud(uid: string): Promise<boolean> {
  try {
    const { createSupabaseBrowserClient } = await import("./supabase-browser");
    const supabase = createSupabaseBrowserClient();

    const [{ data: profileRow }, { data: logsRow }] = await Promise.all([
      supabase.from("profile_backups").select("data").eq("user_id", uid).single(),
      supabase.from("log_backups").select("data").eq("user_id", uid).single(),
    ]);

    if (profileRow?.data) {
      saveProfile(profileRow.data as UserProfile, uid);
    }
    if (logsRow?.data) {
      const k = keys(uid);
      localStorage.setItem(k.logs, JSON.stringify(logsRow.data));
    }

    return !!(profileRow?.data);
  } catch {
    return false;
  }
}

export async function deleteCloudBackups(uid: string): Promise<void> {
  try {
    const { createSupabaseBrowserClient } = await import("./supabase-browser");
    const supabase = createSupabaseBrowserClient();
    await Promise.all([
      supabase.from("profile_backups").delete().eq("user_id", uid),
      supabase.from("log_backups").delete().eq("user_id", uid),
    ]);
  } catch {
    // Non-fatal
  }
}
