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

Arc (Youly) is a conversational AI weight loss coach. The data layer is **DB-primary** (Supabase): food entries, weight, profile, saved meals, and a shared cross-user food reference all live in normalized Postgres tables. localStorage is kept only as an **offline cache mirror** for instant first paint. **Chat history is the exception — it stays local** (`arc_chat_<uid>_<date>`), never synced.

### Auth model

- **Supabase Auth** handles Google and Apple OAuth. Session cookie is maintained by `proxy.ts`. `uid = supabase.auth.getUser().id` on both client and server.
- **DB tables** (see `supabase/schema.sql` + `supabase/rls.sql`): `profiles`, `food_entries`, `weights`, `saved_meals` (+`saved_meal_items`), `food_reference` (global, confirmed-values-only). RLS is the entire security boundary (anon key only): per-user tables scoped by `auth.uid()`; `food_reference` readable/writable by any authenticated user. Run both .sql files in the Supabase SQL editor to provision.
- **Cache mirror**: `lib/db.ts` write-throughs to `arc_profile_<uid>` / `arc_logs_<uid>` so the synchronous getters in `lib/storage.ts` stay consistent for first paint. The legacy `profile_backups` / `log_backups` tables are deprecated (read once by the migration, no longer written).
- **Migration**: `lib/migrate.ts` runs once per uid on login (`app/page.tsx`), idempotently importing legacy localStorage / `*_backups` data into the new tables (reuses `FoodEntry.id` as PK, `on conflict do nothing`).
- **Consent** is tracked per-uid in localStorage (`arc_consent_<uid>`).

### Page routing (/)

`app/page.tsx` checks: session → `runMigration(uid)` → profile (cache then `loadProfile` from DB) → routes to `/login`, `/onboarding`, or `/chat`.

### Required env vars

```
ANTHROPIC_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Data flow

1. User speaks (mic), types, or snaps a nutrition-label photo → `useStreamingChat` hook POSTs to `/api/chat` (image is downscaled client-side and sent as a vision block on that turn)
2. The route authenticates the user, loads context, and runs the tool loop. **Tools are executed SERVER-SIDE** against the user's DB via `lib/chat-tools.ts` (`executeChatTool`) and return real results to the model
3. SSE events: `text_delta` streams text; `tool_call` is forwarded for an optimistic `log_food` macro bump; a `refresh` event tells the client to refetch from the DB
4. ChatInterface reconciles by calling `loadLogs(uid)` (DB → `DailyLogs`)

### Key files

- **`lib/types.ts`** — all shared types (`UserProfile`, `DayLog`, `FoodEntry`, `SavedMeal`, `FoodReference`, `ChatMessage`, `CoachStyle`, `AVATARS`)
- **`lib/db.ts`** — async Supabase CRUD; assembles rows back into the `DailyLogs` shape; write-through cache. Browser-side ("use client")
- **`lib/chat-tools.ts`** — server-side tool execution (`executeChatTool`) + shared `normalizeFoodName`; isomorphic, takes a SupabaseClient
- **`lib/storage.ts`** — synchronous localStorage cache getters (first paint) + chat-history (local-only). Not the source of truth anymore
- **`lib/migrate.ts`** — one-time idempotent legacy→DB migration
- **`lib/calories.ts`** — Mifflin-St Jeor calorie target calc, trajectory/goal-date projection, weekly aggregates (consume the assembled `DailyLogs`)
- **`lib/ai.ts`** — Claude client, tool definitions (`log_food`, `correct_food_entry`, `delete_food_entry`, `log_weight`, `get_log`, `update_coach_style`, `lookup_food`, `confirm_food`, `save_meal`, `list_saved_meals`, `log_saved_meal`), `buildSystemPrompt` (takes a saved-meals summary), `buildOnboardingSystemPrompt`
- **`hooks/useStreamingChat.ts`** — generic SSE streaming hook; supports an optional image per turn and a `refresh` callback
- **`hooks/useSpeechRecognition.ts`** — Web Speech API wrapper; mic button uses `toggle()`, auto-sends on `onFinalResult`
- **`app/meals/page.tsx`** — manage saved meals (create/edit/delete)

### API routes

All three routes are Node.js runtime (`export const runtime = "nodejs"`).

- **`/api/chat`** — authenticates via `createSupabaseServerClient` (401 if no session); multi-turn tool loop that **executes tools server-side** (`lib/chat-tools.ts`) and feeds real results back to Claude; emits a `refresh` SSE when data changed. Accepts an optional `image` (nutrition-label photo) attached to the last user turn. System prompt static part is prompt-cached; the saved-meals list lives in the dynamic (uncached) part.
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
