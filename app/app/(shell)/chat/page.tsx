"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { LoadFailure } from "@/components/shared/LoadFailure";
import { LoadingScreen } from "@/components/ui/Feedback";
import { loadChatHistoryDb } from "@/lib/chat-db";
import { resolveProfile } from "@/lib/resolve-profile";
import { todayStr } from "@/lib/calories";
import type { UserProfile, ChatMessage } from "@/lib/types";

export default function ChatPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [uid, setUid] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    async function init() {
      const r = await resolveProfile();
      if (r.status === "error") {
        setFailed(true);
        return;
      }
      if (r.status === "signed-out") {
        router.replace("/login?next=/app/chat");
        return;
      }
      if (r.status === "needs-onboarding") {
        router.replace("/app/onboarding");
        return;
      }
      setUid(r.uid);
      setProfile(r.profile);
      setMessages(await loadChatHistoryDb(r.uid, todayStr()));
      setLoading(false);
    }
    init();
  }, [router]);

  if (failed) return <LoadFailure />;

  if (loading || !profile) return <LoadingScreen label="Loading your coach" />;

  return <ChatInterface profile={profile} initialMessages={messages} uid={uid} />;
}
