import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { anthropic, buildSystemPrompt, CHAT_TOOLS } from "@/lib/ai";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { executeChatTool, getSavedMealsSummary } from "@/lib/chat-tools";
import type { UserProfile, DailyLogs, ChatMessage } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "unauthenticated" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const uid = user.id;

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
  const today = clientDate || now.toISOString().slice(0, 10);

  // coachStyle is the one profile field the model self-updates via tools — read the
  // freshest value from the DB so mid-session calibration persists into the next turn.
  try {
    const { data: prow } = await supabase.from("profiles").select("coach_style").eq("user_id", uid).maybeSingle();
    const cs = (prow as { coach_style?: UserProfile["coachStyle"] } | null)?.coach_style;
    if (cs && profile) profile.coachStyle = cs;
  } catch {
    /* fall back to the client-provided profile */
  }

  // Saved meals are loaded server-side so the model can resolve "log lunch #2"
  // regardless of client state. Kept in the dynamic (uncached) prompt part.
  const savedMealsSummary = await getSavedMealsSummary(supabase, uid);

  const [staticPrompt, dynamicPrompt] = buildSystemPrompt(
    profile,
    logs,
    now,
    clientDate,
    clientHour,
    clientTimeDisplay,
    savedMealsSummary
  );

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
        const currentMessages = [...anthropicMessages];
        let continueLoop = true;
        let didMutate = false;

        while (continueLoop) {
          const response = await anthropic.messages.create({
            model: "claude-sonnet-4-6",
            max_tokens: 512,
            system: [
              { type: "text", text: staticPrompt, cache_control: { type: "ephemeral" } },
              { type: "text", text: dynamicPrompt },
            ],
            tools: CHAT_TOOLS,
            messages: currentMessages,
            stream: false,
          });

          if (response.stop_reason === "tool_use") {
            const toolUseBlocks = response.content.filter(
              (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
            );
            const textBlocks = response.content.filter(
              (b): b is Anthropic.TextBlock => b.type === "text"
            );

            for (const block of textBlocks) {
              if (block.text.trim()) send({ type: "text_delta", text: block.text });
            }

            // Notify the client of optimistic UI hints (only log_food gets a fast macro bump)
            for (const toolUse of toolUseBlocks) {
              send({ type: "tool_call", name: toolUse.name, input: toolUse.input, id: toolUse.id });
            }

            currentMessages.push({ role: "assistant", content: response.content });

            // Execute each tool for real against the user's DB and return real results.
            const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
              toolUseBlocks.map(async (toolUse) => {
                const result = await executeChatTool(
                  supabase,
                  uid,
                  toolUse.name,
                  toolUse.input as Record<string, unknown>,
                  { today }
                );
                if (toolUse.name !== "get_log" && toolUse.name !== "lookup_food" && toolUse.name !== "list_saved_meals") {
                  didMutate = true;
                }
                return {
                  type: "tool_result" as const,
                  tool_use_id: toolUse.id,
                  content: JSON.stringify(result),
                };
              })
            );

            currentMessages.push({ role: "user", content: toolResults });
          } else {
            continueLoop = false;
            for (const block of response.content) {
              if (block.type === "text") {
                const words = block.text.split(" ");
                for (const word of words) {
                  send({ type: "text_delta", text: word + " " });
                  await new Promise((r) => setTimeout(r, 15));
                }
              }
            }
            // Tell the client to refetch logs from the DB (server owns the writes now)
            if (didMutate) send({ type: "refresh" });
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
