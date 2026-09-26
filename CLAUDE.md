# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
# Development. Another project on this machine owns :3000, so use a dedicated port.
npm run dev -- -p 3137

# Mobile-accessible (binds to all interfaces)
npm run dev -- -H 0.0.0.0 -p 3137

# Type check
npx tsc --noEmit

# Production build
npm run build

# Lint
npm run lint
```

No test suite exists yet. `npx next typegen` regenerates route types after moving or
adding a route — stale generated types show up as phantom `tsc` errors.

## Architecture

Arc (Youly) is a conversational AI weight loss coach. The data layer is **DB-primary** (Supabase): food entries, weight, profile, saved meals, chat history, and a shared cross-user food reference all live in normalized Postgres tables. localStorage is kept only as an **offline cache mirror** for instant first paint.

Chat history used to be local-only. It isn't anymore: Safari caps script-writable storage at 7 days, so any week-long gap silently erased every conversation. It now lives in `chat_messages`, keyed `(user_id, local_date, position)`, with `arc_chat_<uid>_<date>` demoted to a mirror. See `lib/chat-db.ts`.

### Auth model

- **Supabase Auth** handles Google OAuth (Google only — Apple is not wired). Session cookie is maintained by `proxy.ts`. `uid = supabase.auth.getUser().id` on both client and server.
- **DB tables** (see `supabase/schema.sql` + `supabase/rls.sql`): `profiles`, `food_entries`, `weights`, `saved_meals` (+`saved_meal_items`), `chat_messages`, `food_reference` (global, confirmed-values-only). Deltas against an already-provisioned DB live in `supabase/migrations/`. RLS is the entire security boundary (anon key only): per-user tables scoped by `auth.uid()`; `food_reference` readable/writable by any authenticated user. Run both .sql files in the Supabase SQL editor to provision.
- **Cache mirror**: `lib/db.ts` write-throughs to `arc_profile_<uid>` / `arc_logs_<uid>` so the synchronous getters in `lib/storage.ts` stay consistent for first paint. The legacy `profile_backups` / `log_backups` tables are deprecated (read once by the migration, no longer written).
- **Migration**: `lib/migrate.ts` runs once per uid on login (`app/app/start/page.tsx`, plus a fire-and-forget `components/app/MigrationRunner.tsx` mounted in the `/app` layout so deep links also self-repair), idempotently importing legacy localStorage / `*_backups` data into the new tables (reuses `FoodEntry.id` as PK, `on conflict do nothing`).
- **Consent** lives in the `user_consents` table (`supabase/migrations/002_consents.sql`), versioned by `TERMS_VERSION` / `PRIVACY_VERSION` in `lib/consent.ts`. It is collected *after* login, at `/app/consent`, and enforced by `app/app/page.tsx`.
  - It used to be localStorage-only and broken: `lib/storage.ts` defined `arc_consent_<uid>` and `hasConsented()` read it, but the consent screen wrote the un-keyed `arc_consent_done` and nothing read that. Both are gone.
  - It is a **separate table, not columns on `profiles`**, deliberately. Consent is recorded before onboarding creates the profile, and a consent-only `profiles` row would make `loadProfile()` return non-null → `migrateProfile()` concludes "profile exists" → legacy `profile_backups` recovery is skipped forever.

### Route split: public site vs. gated app

```
app/(site)/    /  how-it-works  pricing  faq  privacy  terms   public · static · indexed
app/(auth)/    login                                            noindex
app/app/       page  start  consent  onboarding                 gated · noindex
app/app/(shell)/  chat  progress  meals                         gated · persistent nav
```

`/app` is a real path segment, not a route group, on purpose: `proxy.ts` gates by
**prefix**, so a new gated page cannot be born unprotected. (`/meals` was once
unprotected purely because it was missing from an array.)

**Hard rule for `app/(site)/**`: never call `cookies()`, `headers()`, or read
`searchParams`.** Any of those makes the route dynamic; these pages exist to be
statically prerendered and crawled.

**Routing is split across four places**, because `app/page.tsx` used to do all four:

| Job | Where | Rendering |
|---|---|---|
| Marketing | `app/(site)/page.tsx` | static |
| "Is there a session?" | `proxy.ts` | Node, cookie only |
| "Where does this user belong?" | `app/app/page.tsx` | server, `redirect()` only |
| Migration + the unsafe half of the profile decision | `app/app/start/page.tsx` | client |

`app/app/page.tsx` may only make **positive, safe** decisions. `lib/migrate.ts` can
recover a missing `profiles` row from cache or legacy `profile_backups`, so treating
"no row" as "new user" would resurrect the bug fixed in `acca50c` and overwrite real
data. Anything ambiguous — including an unreadable consent row — falls through to
`/app/start`, which runs the migration **before** reading the profile and then defers
to `lib/resolve-profile.ts`. That ordering is load-bearing.

Signed-in users are **not** redirected away from `/`. `components/site/SessionCta.tsx`
swaps the hero CTA to "Open Youly" after hydration instead, so the homepage stays
reachable and static for everyone.

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

- **`lib/db-core.ts`** — isomorphic row mapping + `loadProfileFrom` / `loadLogsFrom`, taking a `SupabaseClient`. Exists because `lib/db.ts` is `"use client"` and therefore unimportable from a route handler — which is *why* the API routes once trusted client-supplied profile/logs. `lib/db.ts` delegates here and keeps its cache write-through
- **`lib/auth-server.ts`** — `server-only`. `getSessionUser` (React `cache()`d), `requireUser` for Server Components, `requireApiUser` for route handlers. `api/` is outside the proxy matcher, so **every route handler authenticates itself**
- **`lib/consent.ts`** — `getConsent` (`ok | missing | stale | error`) and `recordConsent`. Same discipline as `resolve-profile`: an unreadable row is never treated as an absent one
- **`lib/chart-theme.ts`** — the only hex outside `globals.css`; recharts can't read CSS custom properties
- **`lib/cn.ts`** — 6-line class joiner (no clsx/cva; npm can't reach the registry here)
- **`lib/types.ts`** — all shared types (`UserProfile`, `DayLog`, `FoodEntry`, `SavedMeal`, `FoodReference`, `ChatMessage`, `CoachStyle`, `AVATARS`)
- **`lib/db.ts`** — async Supabase CRUD; assembles rows back into the `DailyLogs` shape; write-through cache. Browser-side ("use client")
- **`lib/chat-tools.ts`** — server-side tool execution (`executeChatTool`) + shared `normalizeFoodName`; isomorphic, takes a SupabaseClient
- **`lib/storage.ts`** — synchronous localStorage cache getters (first paint), including the chat mirror. Not the source of truth anymore
- **`lib/chat-db.ts`** — chat history CRUD against `chat_messages`; a save re-upserts the whole day (idempotent, so a failed write self-heals on the next turn) and trims any leftover tail
- **`lib/resolve-profile.ts`** — the one place that decides ok / signed-out / needs-onboarding / **error**. A profile that can't be *read* must never be treated as a profile that doesn't *exist* — that routes real users into onboarding and overwrites their data
- **`lib/migrate.ts`** — one-time idempotent legacy→DB migration
- **`lib/calories.ts`** — Mifflin-St Jeor calorie target calc, trajectory/goal-date projection, weekly aggregates (consume the assembled `DailyLogs`)
- **`lib/ai.ts`** — Claude client, tool definitions (`log_food`, `correct_food_entry`, `delete_food_entry`, `log_weight`, `get_log`, `update_coach_style`, `lookup_food`, `confirm_food`, `save_meal`, `list_saved_meals`, `log_saved_meal`), `buildSystemPrompt` (takes a saved-meals summary), `buildOnboardingSystemPrompt`
- **`hooks/useStreamingChat.ts`** — generic SSE streaming hook; supports an optional image per turn and a `refresh` callback
- **`hooks/useSpeechRecognition.ts`** — Web Speech API wrapper; mic button uses `toggle()`, auto-sends on `onFinalResult`
- **`app/app/(shell)/meals/page.tsx`** — manage saved meals (create/edit/delete)
- **`components/ui/`** — the primitive layer: `Button`, `Card`, `Container`, `Field`/`Input`, `Sheet` (dialog role + focus trap + Escape + focus restore), `Icon` (hand-rolled, no icon dependency), `IconButton` (`label` is **required**), `Metric` (`ProgressBar`/`Stat`), `Feedback` (`LoadingScreen`/`EmptyState`/`Badge`/`TypingDots`), `SegmentedControl`
- **`components/layout/`** — `AppShell` (sidebar ≥lg, mobile header + bottom tabs below), `AppNav` + `nav-items.ts` (single source of truth for in-app nav paths), `FunnelShell` (the login/consent/onboarding frame)
- **`components/chat/Composer.tsx`** — the voice-first composer, shared by chat and onboarding
- **`components/brand/Wordmark.tsx`** — the only place the wordmark is rendered
- **`components/legal/LegalContent.tsx`** — the single source of the terms/privacy copy

### API routes

All three routes are Node.js runtime (`export const runtime = "nodejs"`).

**`api/` is deliberately outside the `proxy.ts` matcher, so every route handler
authenticates itself** via `requireApiUser()` from `lib/auth-server.ts`. Never rely on
the proxy for authorization here — the Next 16 proxy docs say the same.

The routes must **not** accept `profile` or `logs` from the request body. They read
both server-side under RLS via `lib/db-core.ts`. `/api/summary` and `/api/onboarding`
once had no authentication at all — they were open proxies to `ANTHROPIC_API_KEY` —
and `/api/chat` authenticated but then trusted the body anyway.

- **`/api/chat`** — 401 without a session; multi-turn tool loop that **executes tools server-side** (`lib/chat-tools.ts`) and feeds real results back to Claude; emits a `refresh` SSE when data changed. Accepts from the client **only** `messages` (validated: role in {user, assistant}, string content), the client clock, and an optional `image` (mediaType allowlisted, base64 length capped). Returns 409 `needs-onboarding` when no profile row exists. System prompt static part is prompt-cached; the saved-meals list lives in the dynamic (uncached) part.
- **`/api/onboarding`** — 401 without a session; single-turn; accepts `{ messages, avatar }`, with `avatar` validated against `AVATARS` before it reaches a prompt; parses the `<profile>...</profile>` JSON block from Claude's response to signal completion. No tools.
- **`/api/summary`** — 401 without a session; takes **no body**; reads profile + logs under RLS and generates a weekly narrative. (Reading server-side also fixed a real bug: a stale localStorage cache used to produce summaries describing out-of-date logs.)

### Onboarding flow

Reached at `/app/onboarding`, after login and consent. (There is no longer an intro
screen — it was a marketing page hidden behind a localStorage flag, and `app/(site)/`
replaces it properly.)

1. **Coach picker** — 4 cards (Alex, Dr. Maya, Sam, Coach Rivera) using a 2×2 grid photo (`public/coaches.png`) via CSS quadrant technique in `components/shared/CoachPhoto.tsx`. Purely cosmetic — all coaches behave identically.
2. Tapping a card triggers a `"start"` message to `/api/onboarding` (filtered from display). Claude collects profile info **one question at a time**, texting style.
3. When Claude has all info, it outputs a `<profile>` JSON block → `onProfileComplete` fires → `lib/calories.ts` computes targets → profile saved (uid-scoped) → the "ready" CTA appears → `/app/chat`. A failed save shows a retry rather than navigating.

The screen also carries the destructive **reset**, which wipes every table for the uid.
It is reachable by accident (a profile that merely failed to load lands here), so the
reset sheet counts the food entries it is about to destroy, requires typing `DELETE`,
and points at "switch account" instead — the usual cause is being signed into the
wrong Google account.

Calorie target: Mifflin-St Jeor TDEE minus deficit (250/500/750 cal/day for slow/moderate/aggressive pace).
Protein target: USDA DRI g/kg by activity level (sedentary=1.0, light=1.2, moderate=1.4, active=1.6).

### Coach avatar vs. coach personality

**Avatar** (`coachAvatar` field) = visual identity only — name and emoji shown in the UI. All four avatars are identical in behavior.

**Personality** (`coachStyle` in `UserProfile`) = adaptive over time. Starts at neutral defaults (`supportLevel: 5`, `techDepth: 5`, `checkInStyle: "conversational"`, `observations: []`). Claude calls `update_coach_style` tool when it picks up meaningful signals about how the user responds. This state is injected into every system prompt so it persists across sessions.

### Voice input

`useSpeechRecognition` wraps the Web Speech API (`webkitSpeechRecognition` on iOS Safari). The mic button is always rendered — if the API is unavailable, tapping shows a native alert. `onFinalResult` auto-submits the transcript; `onInterimResult` shows live preview text above the input, inside an `aria-live` region. The composer itself is `components/chat/Composer.tsx`, shared by chat and onboarding.

### Supabase clients

- **`lib/supabase-browser.ts`** — browser singleton (`createBrowserClient`), used in client components
- **`lib/supabase-server.ts`** — `createSupabaseServerClient()` for route handlers and Server Components, plus `createSupabaseProxyClient(request)` for proxy. Proxy needs its own: `cookies()` from `next/headers` can only *read*, and session refresh must *write* `Set-Cookie`, hence the `NextResponse` re-creation
- **`proxy.ts`** — gates `/app` by prefix, round-trips `?next=`, and refreshes the session cookie. **Matcher is deliberately narrow** (`["/app/:path*", "/login", "/auth/:path*"]`): proxy is Node-runtime in Next 16 and cannot be moved to the edge, so the old "every path except assets" matcher paid a serverless invocation plus a Supabase `getUser()` round-trip on every crawler hit of every marketing page — including `/robots.txt`. `/` is intentionally unmatched
- **`app/auth/callback/route.ts`** — exchanges the OAuth code for a session, handles provider `error`/`error_description` (it used to ignore the exchange error entirely), and redirects to a `?next=` that must start with `/app`, else `/app`

### Routing (full flow)

First time: `/` → `/login` → Google OAuth → `/auth/callback` → `/app` → `/app/consent` → agree → `/app` → `/app/start` → `/app/onboarding` → `/app/chat`

Returning: `/app` → `/app/chat` (the one fast path: consent present **and** `onboarding_complete === true`)

Anything ambiguous: `/app` → `/app/start` → migration → `resolveProfile()` → chat, onboarding, or a retry screen. **Never** onboarding on a read failure.

Old top-level paths (`/chat`, `/progress`, `/meals`, `/onboarding`, `/consent`, `/intro`) permanently redirect via `next.config.ts`.

### Design system

`app/globals.css` holds the whole token layer — brand ramp, `ink`/`canvas`/`surface`/
`border`, data-series colours, 4 elevation steps, motion easings, `pt-safe`/`pb-safe`,
one global `:focus-visible`, and a `prefers-reduced-motion` block. **Use the semantic
tokens, not raw Tailwind colour classes.**

**Palette: deep petrol + warm neutrals.** The original emerald scheme was the
category's stock answer — the design catalogue's canned palette for "Calorie &
Nutrition Counter" is literally `#059669` emerald with an orange accent on a mint
background, which is what this was. What reads as dated is flat saturated colour in
large full-bleed blocks plus pure cool neutrals, not the hue, so all three changed:

| token | value | role |
|---|---|---|
| `canvas` | `#FAF8F5` | page ground, warm off-white (Pantone 2026 "Cloud Dancer" family) |
| `surface` | `#FFFFFF` | cards, which lift off the canvas |
| `surface-sunken` | `#F2EDE6` | wells: chips, tracks, avatars, hover |
| `ink` / `ink-body` / `ink-muted` | `#1C1917` / `#44403C` / `#57534E` | warm charcoal, not blue-black |
| `brand-600` / `700` / `900` / `950` | `#0F5E6A` / `#0B4A55` / `#0A3038` / `#052026` | petrol: fill / text / blocks |
| `accent` | `#B4530F` | warm ember, stops the petrol reading clinical |
| `border-subtle` / `border-strong` | `#E7E1D8` / `#8F8271` | hairline / control boundary |

Three things are load-bearing and shouldn't be "tidied":

- **`canvas` vs `surface-sunken` are different roles.** They were one token once; a
  well the same colour as the page is invisible against a white card.
- **`border-strong` is dark on purpose.** Input and control boundaries must clear
  3:1; the earlier `#E5E7EB` managed 1.56:1.
- **Data series are petrol and ochre, not petrol and blue.** Teal-vs-amber sits on
  the blue-yellow axis and survives red-green colour blindness; teal-vs-blue does
  not. Every use is paired with a text label anyway.

Colour is used sparingly by area: only the homepage hero and closing CTA are deep
blocks. Five full-bleed bands was the biggest dated signal. Contrast was computed,
not eyeballed — 41 pairs, all passing — so re-check the maths before changing a value.

DM Sans is the single typeface. `body` was previously pinned to
`font-family: Arial, Helvetica` while `font-sans` was never used as a class, so the
whole app rendered in Arial while three `next/font` families downloaded unpainted.

Use `h-dvh`, never `h-screen` (100vh sits behind the iOS address bar). Dark mode is
**not** implemented — the dead half-wired `dark:` scaffolding was removed rather than
left as a false promise.

### Mobile dev access

`allowedDevOrigins` in `next.config.ts` lists the local machine IPs; update it if yours changes. Run dev on a dedicated port (`npm run dev -- -p 3137`) — another project on this machine owns `:3000`. The dev overlay is disabled via `devIndicators: false`.

### Secrets — never commit

`.env.local`, `client_secret*.json`, and `*password*.txt` are gitignored. All three env vars (`ANTHROPIC_API_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) must be set in both `.env.local` (local) and Vercel environment variables (production).
