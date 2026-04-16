"use client";

import { useState, useCallback, useRef } from "react";
import type { ChatMessage } from "@/lib/types";

interface StreamEvent {
  type: "text_delta" | "tool_call" | "done" | "error" | "profile_complete";
  text?: string;
  name?: string;
  input?: Record<string, unknown>;
  id?: string;
  message?: string;
  profileJson?: string;
}

interface UseStreamingChatOptions {
  endpoint: string;
  getBody: (messages: ChatMessage[]) => object;
  onToolCall?: (name: string, input: Record<string, unknown>, id: string) => void;
  onProfileComplete?: (profileJson: string) => void;
  onDone?: (messages: ChatMessage[]) => void;
}

export function useStreamingChat({
  endpoint,
  getBody,
  onToolCall,
  onProfileComplete,
  onDone,
}: UseStreamingChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (userText: string) => {
      const userMsg: ChatMessage = {
        role: "user",
        content: userText,
        timestamp: new Date().toISOString(),
      };

      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setStreamingText("");
      setIsLoading(true);

      abortRef.current = new AbortController();

      try {
        const resp = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(getBody(newMessages)),
          signal: abortRef.current.signal,
        });

        if (!resp.ok || !resp.body) throw new Error("Request failed");

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const event: StreamEvent = JSON.parse(line.slice(6));

              if (event.type === "text_delta" && event.text) {
                accumulated += event.text;
                setStreamingText(accumulated);
              } else if (
                event.type === "tool_call" &&
                event.name &&
                event.input &&
                event.id
              ) {
                onToolCall?.(event.name, event.input, event.id);
              } else if (event.type === "profile_complete" && event.profileJson) {
                onProfileComplete?.(event.profileJson);
              } else if (event.type === "done") {
                const assistantMsg: ChatMessage = {
                  role: "assistant",
                  content: accumulated.trim(),
                  timestamp: new Date().toISOString(),
                };
                const finalMessages = [...newMessages, assistantMsg];
                setMessages(finalMessages);
                setStreamingText("");
                onDone?.(finalMessages);
              } else if (event.type === "error") {
                throw new Error(event.message ?? "Stream error");
              }
            } catch {
              // Skip malformed lines
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          const errMsg: ChatMessage = {
            role: "assistant",
            content: "Sorry, something went wrong. Please try again.",
            timestamp: new Date().toISOString(),
          };
          setMessages((prev) => [...prev, errMsg]);
          setStreamingText("");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [messages, endpoint, getBody, onToolCall, onProfileComplete, onDone]
  );

  const reset = useCallback(() => {
    setMessages([]);
    setStreamingText("");
    setIsLoading(false);
  }, []);

  return { messages, streamingText, isLoading, sendMessage, setMessages, reset };
}
