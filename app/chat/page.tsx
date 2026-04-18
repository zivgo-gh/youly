"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { getProfile, getChatHistory } from "@/lib/storage";
import { todayStr } from "@/lib/calories";
import { createSupabaseBrowserClient } from "@/lib/supabase-browser";
import type { UserProfile, ChatMessage } from "@/lib/types";

export default function ChatPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [uid, setUid] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id;
      setUid(userId);

      const p = getProfile(userId);
      if (!p || !p.onboardingComplete) {
        router.replace("/onboarding");
        return;
      }
      setProfile(p);
      setMessages(getChatHistory(userId, todayStr()));
      setLoading(false);
    }
    init();
  }, [router]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return <ChatInterface profile={profile} initialMessages={messages} uid={uid} />;
}
