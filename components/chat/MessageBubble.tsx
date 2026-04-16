"use client";

import type { ChatMessage } from "@/lib/types";
import type { CoachAvatar } from "@/lib/types";
import { AVATARS } from "@/lib/types";

interface Props {
  message: ChatMessage;
  coachAvatar?: CoachAvatar;
  isStreaming?: boolean;
}

export function MessageBubble({ message, coachAvatar = "alex", isStreaming }: Props) {
  const isUser = message.role === "user";
  const avatar = AVATARS[coachAvatar];

  return (
    <div className={`flex gap-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
      {!isUser && (
        <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-sm">
          {avatar.emoji}
        </div>
      )}
      <div
        className={`max-w-[78%] rounded-2xl px-4 py-3 text-lg leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-emerald-500 text-white rounded-tr-sm"
            : "bg-white text-gray-800 border border-gray-100 rounded-tl-sm shadow-sm"
        }`}
      >
        {message.content}
        {isStreaming && (
          <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-emerald-400 animate-pulse rounded-sm" />
        )}
      </div>
      {isUser && (
        <div className="shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-sm">
          👤
        </div>
      )}
    </div>
  );
}
