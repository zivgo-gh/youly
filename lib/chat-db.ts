"use client";

// Chat history persistence.
//
// Chat used to be localStorage-only. Safari caps script-writable storage at 7 days, so
// any week-long gap silently erased every conversation — while food, weight and profile
// data survived because they live in Postgres. This moves chat to the same footing.
//
// Shape: one row per message, keyed (user_id, local_date, position). A save re-upserts
// the whole day rather than diffing, which makes it idempotent and self-healing — a save
// that fails is simply corrected by the next one, since every save carries the full day.
// Days are capped at a few hundred messages in practice, so the write stays small.

import { createSupabaseBrowserClient } from "./supabase-browser";
import { getChatHistory, saveChatHistory } from "./storage";
import type { ChatMessage } from "./types";

interface ChatMessageRow {
  local_date: string;
  position: number;
  role: string;
  content: string;
  ts: string;
}

function rowToMessage(r: ChatMessageRow): ChatMessage {
  return {
    role: r.role === "user" ? "user" : "assistant",
    content: r.content,
    timestamp: r.ts,
  };
}

// ChatMessage.timestamp is client-generated; never let a malformed one reject the write.
function safeTimestamp(value: string | undefined): string {
  const d = value ? new Date(value) : new Date();
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

// Reads a day's thread from the DB and refreshes the local mirror.
// Falls back to the local mirror if the DB is unreachable, so a flaky network degrades
// to "possibly stale" rather than "your history is gone".
export async function loadChatHistoryDb(uid: string, date: string): Promise<ChatMessage[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("local_date,position,role,content,ts")
    .eq("user_id", uid)
    .eq("local_date", date)
    .order("position", { ascending: true });

  if (error) {
    console.error("chat history load failed:", error.message);
    return getChatHistory(uid, date);
  }

  const messages = ((data ?? []) as ChatMessageRow[]).map(rowToMessage);
  saveChatHistory(messages, uid, date); // keep the offline mirror current
  return messages;
}

// Persists a day's thread. Returns false if the DB write failed (the local mirror is
// still written, and the next save re-sends the full day).
export async function saveChatHistoryDb(
  uid: string,
  date: string,
  messages: ChatMessage[]
): Promise<boolean> {
  saveChatHistory(messages, uid, date); // mirror first — never lose the message locally

  const supabase = createSupabaseBrowserClient();
  const rows = messages.map((m, i) => ({
    user_id: uid,
    local_date: date,
    position: i,
    role: m.role,
    content: m.content,
    ts: safeTimestamp(m.timestamp),
  }));

  if (rows.length > 0) {
    const { error } = await supabase
      .from("chat_messages")
      .upsert(rows, { onConflict: "user_id,local_date,position" });
    if (error) {
      console.error("chat history save failed:", error.message);
      return false;
    }
  }

  // Drop any tail left over from a previously longer thread so the DB matches memory.
  const { error: trimError } = await supabase
    .from("chat_messages")
    .delete()
    .eq("user_id", uid)
    .eq("local_date", date)
    .gte("position", rows.length);
  if (trimError) {
    console.error("chat history trim failed:", trimError.message);
    return false;
  }

  return true;
}

// Dates that have at least one stored message, newest first.
export async function loadChatDatesDb(uid: string): Promise<string[]> {
  const supabase = createSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .select("local_date")
    .eq("user_id", uid)
    .order("local_date", { ascending: false });

  if (error) {
    console.error("chat dates load failed:", error.message);
    return [];
  }

  const seen = new Set<string>();
  for (const r of (data ?? []) as { local_date: string }[]) seen.add(r.local_date);
  return [...seen].sort().reverse();
}

export async function deleteChatHistoryDb(uid: string, date?: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  let q = supabase.from("chat_messages").delete().eq("user_id", uid);
  if (date) q = q.eq("local_date", date);
  await q;
}
