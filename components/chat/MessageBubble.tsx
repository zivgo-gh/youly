"use client";

import type { ChatMessage, CoachAvatar } from "@/lib/types";
import { CoachPhoto } from "@/components/shared/CoachPhoto";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/cn";

interface Props {
  message: ChatMessage;
  coachAvatar?: CoachAvatar;
  isStreaming?: boolean;
}

export function MessageBubble({
  message,
  coachAvatar = "alex",
  isStreaming,
}: Props) {
  const isUser = message.role === "user";

  return (
    <div className={cn("flex gap-3", isUser ? "flex-row-reverse" : "flex-row")}>
      {!isUser ? (
        <CoachPhoto avatar={coachAvatar} size={36} className="mt-0.5" />
      ) : null}
      <div
        className={cn(
          // Capped in ch as well as % so a bubble doesn't stretch to 78% of a
          // 2560px monitor and become unreadable.
          "max-w-[80%] rounded-2xl px-4 py-3 text-base leading-relaxed whitespace-pre-wrap sm:max-w-[46ch]",
          isUser
            ? "rounded-tr-sm bg-brand-600 text-white"
            : "rounded-tl-sm border border-border-subtle bg-surface text-ink-body shadow-card"
        )}
      >
        {message.content}
        {isStreaming ? (
          <span
            aria-hidden="true"
            className="ml-0.5 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-brand-600 align-text-bottom"
          />
        ) : null}
      </div>
      {isUser ? (
        // Was a bare emoji in an unlabelled div, invisible to a screen reader.
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-sunken text-ink-muted">
          <Icon name="user" size={18} />
          <span className="sr-only">You</span>
        </span>
      ) : null}
    </div>
  );
}
