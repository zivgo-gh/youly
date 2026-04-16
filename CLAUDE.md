# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
# Development (mobile-accessible — binds to all interfaces)
npm run dev -- -H 0.0.0.0

# Standard dev (localhost only)
npm run dev

# Type check
npx tsc --noEmit

# Production build
npm run build

# Lint
npm run lint
```

No test suite exists yet.

## Architecture

Arc is a conversational AI weight loss coach. The entire data layer is **localStorage-only** — no backend database. All persistence flows through `lib/storage.ts`, which is the single swap point if a backend (e.g. Supabase) is added later.

### Data flow

1. User speaks (mic) or types → `useStreamingChat` hook POSTs to an API route
2. API route calls Claude with a system prompt + tool definitions, streams back SSE events
3. Hook parses SSE: `text_delta` events update the streaming UI; `tool_call` events are forwarded to the caller via `onToolCall` callback
4. Caller (ChatInterface or OnboardingPage) executes tool calls against `lib/storage.ts` and refreshes local state

### Key files

- **`lib/types.ts`** — all shared types (`UserProfile`, `DayLog`, `FoodEntry`, `ChatMessage`, `CoachStyle`, `AVATARS`)
- **`lib/storage.ts`** — all localStorage reads/writes; never call `localStorage` directly elsewhere
- **`lib/calories.ts`** — Mifflin-St Jeor calorie target calc, trajectory/goal-date projection, weekly aggregates
- **`lib/ai.ts`** — Claude client, all 6 tool definitions (`log_food`, `correct_food_entry`, `delete_food_entry`, `log_weight`, `get_log`, `update_coach_style`), `buildSystemPrompt`, `buildOnboardingSystemPrompt`
- **`hooks/useStreamingChat.ts`** — generic SSE streaming hook; shared by both onboarding and main chat
- **`hooks/useSpeechRecognition.ts`** — Web Speech API wrapper; mic button uses `toggle()`, auto-sends on `onFinalResult`

### API routes

All three routes are Node.js runtime (`export const runtime = "nodejs"`).

- **`/api/chat`** — multi-turn tool loop: calls Claude, if `stop_reason === "tool_use"` sends tool results back and loops until a text response is produced. System prompt is prompt-cached (profile section).
- **`/api/onboarding`** — single-turn; accepts `{ messages, avatar }` in the request body; parses `<profile>...</profile>` JSON block from Claude's response to signal onboarding completion. No tools.
- **`/api/summary`** — single-turn, generates a weekly narrative; called on demand from the progress page.

### Onboarding flow

1. User lands on `/onboarding` and sees a **coach picker** — 4 cards (Alex ⚡, Dr. Maya 🔬, Sam 😊, Coach Rivera 💪). This is a purely cosmetic/identity choice; all coaches start from identical settings.
2. Tapping a card sets `selectedAvatar` state and triggers a `"start"` message to `/api/onboarding` (filtered from display).
3. Claude introduces itself by the chosen coach's name and collects profile info **one question at a time** — texting style, never more than one question per message.
4. When Claude has everything, it appends a `<profile>` JSON block → `onProfileComplete` fires → `lib/calories.ts` computes calorie/protein targets → profile saved → redirect to `/chat`.

### Coach avatar vs. coach personality

**Avatar** (`coachAvatar` field) = visual identity only — name and emoji shown in the UI. All four avatars are identical in behavior.

**Personality** (`coachStyle` in `UserProfile`) = adaptive over time. Starts at neutral defaults (`supportLevel: 5`, `techDepth: 5`, `checkInStyle: "conversational"`, `observations: []`). Claude calls `update_coach_style` tool when it picks up meaningful signals about how the user responds. This state is injected into every system prompt so it persists across sessions.

### Voice input

`useSpeechRecognition` wraps the Web Speech API (`webkitSpeechRecognition` on iOS Safari). The mic button is always rendered — if the API is unavailable, tapping shows a native alert. `onFinalResult` auto-submits the transcript; `onInterimResult` shows live preview text above the input.

### Routing

`/` detects localStorage profile → redirects via `window.location.replace` (not `router.replace`) to `/onboarding` or `/chat`.

### Mobile dev access

The `allowedDevOrigins` in `next.config.ts` is set to `10.0.0.140` (local machine IP). Update this if the IP changes. The dev overlay is disabled via `devIndicators: false`.
