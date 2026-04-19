import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { anthropic, buildSystemPrompt, CHAT_TOOLS } from "@/lib/ai";
import type { UserProfile, DailyLogs, ChatMessage } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    messages,
    profile,
    logs,
    clientTime,
    clientDate,
    clientHour,
    clientTimeDisplay,
  }: {
    messages: ChatMessage[];
    profile: UserProfile;
    logs: DailyLogs;
    clientTime?: string;
    clientDate?: string;
    clientHour?: number;
    clientTimeDisplay?: string;
  } = body;

  const now = clientTime ? new Date(clientTime) : new Date();
  const [staticPrompt, dynamicPrompt] = buildSystemPrompt(profile, logs, now, clientDate, clientHour, clientTimeDisplay);

  // Cap history to last 20 messages to control token usage
  const anthropicMessages: Anthropic.MessageParam[] = messages.slice(-20).map((m) => ({
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
        // We may need multiple API calls if the model uses tools
        let currentMessages = [...anthropicMessages];
        let continueLoop = true;

        while (continueLoop) {
          const response = await anthropic.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 512,
            system: [
              {
                type: "text",
                text: staticPrompt,
                cache_control: { type: "ephemeral" },
              },
              {
                type: "text",
                text: dynamicPrompt,
              },
            ],
            tools: CHAT_TOOLS,
            messages: currentMessages,
            stream: false, // We'll handle streaming manually after tool resolution
          });

          if (response.stop_reason === "tool_use") {
            // Process tool calls — send them to the client so it can update state
            const toolUseBlocks = response.content.filter(
              (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
            );
            const textBlocks = response.content.filter(
              (b): b is Anthropic.TextBlock => b.type === "text"
            );

            // Send any text that came before tool use
            for (const block of textBlocks) {
              if (block.text.trim()) {
                send({ type: "text_delta", text: block.text });
              }
            }

            // Send tool calls to client
            for (const toolUse of toolUseBlocks) {
              send({ type: "tool_call", name: toolUse.name, input: toolUse.input, id: toolUse.id });
            }

            // Add assistant message and tool results to continue the loop
            currentMessages.push({
              role: "assistant",
              content: response.content,
            });

            // Build tool results (the client handles actual storage; we return success)
            const toolResults: Anthropic.ToolResultBlockParam[] = toolUseBlocks.map(
              (toolUse) => ({
                type: "tool_result" as const,
                tool_use_id: toolUse.id,
                content: JSON.stringify({ success: true }),
              })
            );

            currentMessages.push({
              role: "user",
              content: toolResults,
            });
          } else {
            // End of conversation turn — stream the final text
            continueLoop = false;
            for (const block of response.content) {
              if (block.type === "text") {
                // Stream word by word for a nicer effect
                const words = block.text.split(" ");
                for (const word of words) {
                  send({ type: "text_delta", text: word + " " });
                  await new Promise((r) => setTimeout(r, 15));
                }
              }
            }
            send({ type: "done" });
          }
        }
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
