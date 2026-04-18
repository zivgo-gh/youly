# Future Feature Ideas

## 1. Real-Time User Feedback Collection
Capture in-app feedback from users during or after sessions and store it for review.
- Thumbs up/down on coach responses
- Post-session "how did that feel?" prompt (optional, not intrusive)
- Free-text feedback widget accessible from account menu
- Store feedback with session metadata (date, message count, coach avatar) in Supabase

## 2. E-Commerce Monetization via Amazon Agent
Surface relevant product recommendations (supplements, meal prep tools, fitness gear) in context.
- Trigger only when user mentions a relevant pain point ("I struggle with protein") or goal
- Amazon affiliate links via Product Advertising API
- Keep recommendations rare and genuinely useful — not spammy
- Coach persona delivers them conversationally ("A lot of people in your situation use X…")
- Track click-through and conversion per recommendation

## 3. Chat Scope Limiting (Diet & Exercise Only)
Prevent abuse and excessive token usage by restricting the agent to its intended domain.
- System prompt hard boundary: refuse off-topic requests gracefully ("I'm focused on your nutrition and fitness — let's keep it there")
- Pre-flight topic classifier (lightweight heuristic or small model) to catch off-topic messages before they hit Claude
- Rate limiting per user: daily message cap (e.g. 50 messages/day) stored server-side
- Exponential backoff messaging if user hits limit ("You've been busy today! Come back tomorrow.")
- Log rejected/out-of-scope requests for pattern analysis

## 4. Anonymous Usage Metrics
Instrument the app for behavioral analytics without storing PII.
- Events to track: session start, message sent, food logged, weight logged, date navigation, food log edit, copy transcript, onboarding completion, coach avatar chosen
- Use a random anonymous device ID (not linked to uid) for pre-auth events
- Post-auth: hash the uid before storing so it's unlinkable to identity
- Backend: Supabase events table or PostHog (free tier)
- Dashboards: DAU/MAU, avg messages per session, most common food items, drop-off point in onboarding funnel

## 5. Security Best Practices Audit
Review and harden the app before scaling.
- API route auth: verify Supabase session server-side on every `/api/chat` call (currently trusts client-sent profile)
- Input sanitization: strip prompt injection attempts before passing user messages to Claude
- Rate limiting at the edge (Vercel middleware / Upstash Redis)
- RLS policies on Supabase tables — audit that `profile_backups` and `log_backups` are truly scoped to `auth.uid()`
- Secret rotation plan for `ANTHROPIC_API_KEY`
- CSP headers for the Next.js app

## 6. Token Usage Estimation & Cost Forecasting
Build visibility into per-user token consumption to model unit economics at scale.
- Log input + output tokens per API call (Claude returns usage in response metadata)
- Store in Supabase `token_usage` table: `(uid_hash, date, input_tokens, output_tokens, route)`
- Daily/monthly rollup per user: average tokens/session, power users vs. casual users
- Cost model: Claude Sonnet pricing × avg tokens → cost per user per month
- Growth forecast: project cost at 1K / 10K / 100K MAU
- Trigger alert if a single user exceeds a daily token budget (potential abuse signal)
