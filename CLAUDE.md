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

Arc (Youly) is a conversational AI weight loss coach. The data layer is **local-first**: all data lives in localStorage, keyed by user ID. Supabase is used only for authentication and optional cloud backup/restore.

### Auth model

- **Supabase Auth** handles Google and Apple OAuth. Session cookie is maintained by `proxy.ts`.
- **localStorage keys are scoped by uid**: `arc_profile_<uid>`, `arc_logs_<uid>`, `arc_chat_<uid>`. All storage functions in `lib/storage.ts` accept an optional `uid` param; without it they fall back to legacy unscoped keys.
- **Cloud backup** (non-blocking): after saves, `syncProfileToCloud` / `syncLogsToCloud` push to Supabase `profile_backups` / `log_backups` tables. On fresh login to an empty device, `restoreFromCloud` pulls the backup.
- **Consent** is tracked per-uid in localStorage (`arc_consent_<uid>`).

### Page routing (/)

`app/page.tsx` checks: session → consent → local profile → cloud restore → routes to `/login`, `/consent`, `/onboarding`, or `/chat`.

### Required env vars

```
ANTHROPIC_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

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

1. **Intro screen** — marketing screen with value props and "Meet your coach →" CTA.
2. **Coach picker** — 4 cards (Alex, Dr. Maya, Sam, Coach Rivera) using a 2×2 grid photo (`public/coaches.png`) via CSS quadrant technique in `components/shared/CoachPhoto.tsx`. Purely cosmetic — all coaches behave identically.
3. Tapping a card triggers a `"start"` message to `/api/onboarding` (filtered from display). Claude collects profile info **one question at a time**, texting style.
4. When Claude has all info, it outputs a `<profile>` JSON block → `onProfileComplete` fires → `lib/calories.ts` computes targets → profile saved (uid-scoped) + background cloud sync → "I'm ready — let's go!" CTA appears → `/chat`.

Calorie target: Mifflin-St Jeor TDEE minus deficit (250/500/750 cal/day for slow/moderate/aggressive pace).
Protein target: USDA DRI g/kg by activity level (sedentary=1.0, light=1.2, moderate=1.4, active=1.6).

### Coach avatar vs. coach personality

**Avatar** (`coachAvatar` field) = visual identity only — name and emoji shown in the UI. All four avatars are identical in behavior.

**Personality** (`coachStyle` in `UserProfile`) = adaptive over time. Starts at neutral defaults (`supportLevel: 5`, `techDepth: 5`, `checkInStyle: "conversational"`, `observations: []`). Claude calls `update_coach_style` tool when it picks up meaningful signals about how the user responds. This state is injected into every system prompt so it persists across sessions.

### Voice input

`useSpeechRecognition` wraps the Web Speech API (`webkitSpeechRecognition` on iOS Safari). The mic button is always rendered — if the API is unavailable, tapping shows a native alert. `onFinalResult` auto-submits the transcript; `onInterimResult` shows live preview text above the input.

### Supabase clients

- **`lib/supabase-browser.ts`** — browser singleton (`createBrowserClient`), used in client components
- **`lib/supabase-server.ts`** — server client (`createServerClient` with cookie helpers), used in API routes and Server Components
- **`proxy.ts`** — refreshes session cookie on every request; redirects unauthenticated users away from `/chat`, `/progress`, `/consent` (Next.js 16 renamed middleware → proxy)
- **`app/auth/callback/route.ts`** — exchanges OAuth code for session, redirects to `/`

### New pages

- **`/login`** — Google + Apple sign-in buttons, privacy badge
- **`/consent`** — privacy-first consent screen shown once per device after first login; stores `arc_consent_<uid>` on agree

### Routing (full flow)

First time: `/` → `/login` (no session) → OAuth → `/auth/callback` → `/` → `/consent` (no consent) → agree → `/` → `/onboarding` (no profile) → `/chat`

Returning same device: `/` → `/chat` (session + consent + profile all present)

Returning new device: `/` → `/consent` (new localStorage) → agree → cloud restore → `/chat`

### Mobile dev access

The `allowedDevOrigins` in `next.config.ts` is set to `10.0.0.140` (local machine IP). Update this if the IP changes. The dev overlay is disabled via `devIndicators: false`.

### Secrets — never commit

`.env.local`, `client_secret*.json`, and `*password*.txt` are gitignored. All three env vars (`ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) must be set in both `.env.local` (local) and Vercel environment variables (production).
