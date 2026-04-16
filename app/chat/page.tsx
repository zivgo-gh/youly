"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatInterface } from "@/components/chat/ChatInterface";
import { getProfile, getChatHistory } from "@/lib/storage";
import type { UserProfile, ChatMessage } from "@/lib/types";

export default function ChatPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const p = getProfile();
    if (!p || !p.onboardingComplete) {
      router.replace("/onboarding");
      return;
    }
    setProfile(p);
    setMessages(getChatHistory());
    setLoading(false);
  }, [router]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-400 text-sm">Loading...</div>
      </div>
    );
  }

  return <ChatInterface profile={profile} initialMessages={messages} />;
}
