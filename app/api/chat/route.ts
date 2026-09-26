import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { anthropic, buildSystemPrompt, CHAT_TOOLS } from "@/lib/ai";
import { requireApiUser } from "@/lib/auth-server";
import { executeChatTool, getSavedMealsSummary } from "@/lib/chat-tools";
import { loadProfileFrom, loadLogsFrom } from "@/lib/db-core";
import type { ChatMessage } from "@/lib/types";

const ALLOWED_MEDIA = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type AllowedMedia = (typeof ALLOWED_MEDIA)[number];

// ~4.5MB is the Vercel request-body ceiling; the client already downscales to a
// 1280px JPEG, so anything near this is not a label photo.
const MAX_IMAGE_B64 = 4_000_000;

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireApiUser();
  if (!auth.ok) return auth.response;
  const { supabase, uid } = auth;

  const body = await req.json();
  const {
    messages,
    clientTime,
    clientDate,
    clientHour,
    clientTimeDisplay,
    image,
  }: {
    messages: ChatMessage[];
    clientTime?: string;
    clientDate?: string;
    clientHour?: number;
    clientTimeDisplay?: string;
    image?: { data: string; mediaType: AllowedMedia };
  } = body;

  // The client legitimately owns the message list and its own clock. It does NOT
  // own the profile or the logs — those used to arrive in this body, which meant
  // anyone with a session could claim any targets or any eating history.
  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: "messages required" }, 400);
  }
  for (const m of messages) {
    if (
      (m?.role !== "user" && m?.role !== "assistant") ||
      typeof m?.content !== "string"
    ) {
      return json({ error: "malformed message" }, 400);
    }
  }
  if (image) {
    if (!ALLOWED_MEDIA.includes(image.mediaType)) {
      return json({ error: "unsupported image type" }, 400);
    }
    if (typeof image.data !== "string" || image.data.length > MAX_IMAGE_B64) {
      return json({ error: "image too large" }, 413);
    }
  }

  const now = clientTime ? new Date(clientTime) : new Date();
  const today = clientDate || now.toISOString().slice(0, 10);

  // Read under RLS. This also fixes a real correctness bug: a stale localStorage
  // cache used to produce coaching based on out-of-date logs. And reading the whole
  // profile row removes the coach_style-only patch this used to need.
  let profile;
  let logs;
  try {
    [profile, logs] = await Promise.all([
      loadProfileFrom(supabase, uid),
      loadLogsFrom(supabase, uid),
    ]);
  } catch {
    return json({ error: "could not load your data" }, 503);
  }

  // Previously `profile` could arrive undefined and buildSystemPrompt would
  // dereference profile.coachStyle, throwing a 500 mid-stream.
  if (!profile) return json({ error: "needs-onboarding" }, 409);

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
    content: m.content as string | Anthropic.ContentBlockParam[],
  }));

  // Attach a nutrition-label photo (if any) to the current (last user) turn.
  if (image?.data && anthropicMessages.length > 0) {
    const last = anthropicMessages[anthropicMessages.length - 1];
    if (last.role === "user") {
      const caption = typeof last.content === "string" ? last.content : "";
      last.content = [
        { type: "image", source: { type: "base64", media_type: image.mediaType, data: image.data } },
        { type: "text", text: caption || "Here's a nutrition label — please read it and log it." },
      ];
    }
  }

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
            max_tokens: 1024,
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
