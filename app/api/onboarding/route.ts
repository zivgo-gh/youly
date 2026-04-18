import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { anthropic, buildOnboardingSystemPrompt } from "@/lib/ai";
import type { ChatMessage } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { messages, avatar, clientTime }: { messages: ChatMessage[]; avatar: import("@/lib/types").CoachAvatar; clientTime?: string } = body;

  const now = clientTime ? new Date(clientTime) : new Date();
  const systemPrompt = buildOnboardingSystemPrompt(now, avatar ?? "alex");

  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      function send(data: object) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      }

      try {
        const response = await anthropic.messages.create({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: [
            {
              type: "text",
              text: systemPrompt,
              cache_control: { type: "ephemeral" },
            },
          ],
          messages: anthropicMessages,
          stream: false,
        });

        let fullText = "";
        for (const block of response.content) {
          if (block.type === "text") {
            fullText += block.text;
          }
        }

        // Check if response contains a completed profile
        const profileMatch = fullText.match(/<profile>([\s\S]*?)<\/profile>/);
        if (profileMatch) {
          const profileJson = profileMatch[1].trim();
          // Send the text without the profile block
          const cleanText = fullText.replace(/<profile>[\s\S]*?<\/profile>/, "").trim();

          // Stream the clean text
          const words = cleanText.split(" ");
          for (const word of words) {
            send({ type: "text_delta", text: word + " " });
            await new Promise((r) => setTimeout(r, 15));
          }

          // Send profile data
          send({ type: "profile_complete", profileJson });
        } else {
          // Stream normally
          const words = fullText.split(" ");
          for (const word of words) {
            send({ type: "text_delta", text: word + " " });
            await new Promise((r) => setTimeout(r, 15));
          }
        }

        send({ type: "done" });
      } catch (err) {
        send({ type: "error", message: err instanceof Error ? err.message : "Unknown error" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
