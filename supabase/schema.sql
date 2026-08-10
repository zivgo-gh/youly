-- youly (Arc) — DB-primary schema
-- Run this in the Supabase SQL editor FIRST, then run rls.sql.
-- Anon key only: every table is protected by Row Level Security (see rls.sql).
--
-- Notes on numeric types:
--   calories      -> integer            (always whole numbers in app data)
--   protein/weight-> double precision   (matches JS float64; PostgREST returns these as JSON numbers,
--                                         whereas `numeric` would come back as strings)

-- ─── profiles (DB-primary; replaces profile_backups) ──────────────────────────
create table if not exists public.profiles (
  user_id               uuid primary key references auth.users(id) on delete cascade default auth.uid(),
  name                  text,
  age                   int,
  sex                   text,
  height_in             int,
  current_weight_lbs    double precision,
  goal_weight_lbs       double precision,
  activity_level        text,
  daily_calorie_target  int,
  daily_protein_target  int,
  daily_deficit         int,
  coach_avatar          text,
  coach_style           jsonb not null default '{}'::jsonb,   -- {supportLevel,techDepth,checkInStyle,observations[]}
  interested_in_fitness boolean,
  habits                text,
  challenges            jsonb not null default '[]'::jsonb,
  predicted_goal_date   text,
  onboarding_complete   boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ─── food_entries (one row per FoodEntry) ─────────────────────────────────────
-- id reuses the app-generated FoodEntry.id so migration is idempotent (on conflict do nothing).
create table if not exists public.food_entries (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade,
  local_date  date not null,                 -- YYYY-MM-DD bucket (client local date)
  ts          timestamptz not null,          -- FoodEntry.timestamp
  description text not null,
  calories    int not null default 0,
  protein     double precision not null default 0,
  meal        text,                          -- breakfast|lunch|dinner|snack|null
  corrected   boolean not null default false,
  source      text not null default 'ai',    -- ai | manual | saved_meal | seed | migration
  created_at  timestamptz not null default now()
);
create index if not exists food_entries_user_date_idx on public.food_entries (user_id, local_date);

-- ─── weights (one per user per day) ───────────────────────────────────────────
create table if not exists public.weights (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  local_date date not null,
  weight_lbs double precision not null,
  created_at timestamptz not null default now(),
  primary key (user_id, local_date)
);

-- ─── saved_meals + items (numbering derived at read time) ──────────────────────
create table if not exists public.saved_meals (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name       text not null,
  meal       text not null,                  -- breakfast|lunch|dinner|snack (category for numbering)
  created_at timestamptz not null default now()
);
create index if not exists saved_meals_user_meal_idx on public.saved_meals (user_id, meal, created_at);

create table if not exists public.saved_meal_items (
  id          uuid primary key default gen_random_uuid(),
  meal_id     uuid not null references public.saved_meals(id) on delete cascade,
  user_id     uuid not null default auth.uid() references auth.users(id) on delete cascade, -- carried so RLS needs no join
  description text not null,
  calories    int not null default 0,
  protein     double precision not null default 0,
  position    int not null default 0
);
create index if not exists saved_meal_items_meal_idx on public.saved_meal_items (meal_id);

-- ─── chat_messages (one row per message, ordered within a day) ────────────────
-- Chat used to be localStorage-only, which meant Safari's 7-day ITP cap silently
-- deleted it after any week-long gap. `position` is the index within that day's
-- thread, so the whole day can be re-upserted idempotently.
create table if not exists public.chat_messages (
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  local_date date not null,                 -- YYYY-MM-DD bucket (client local date)
  position   int  not null,                 -- 0-based index within the day's thread
  role       text not null,                 -- user | assistant
  content    text not null,
  ts         timestamptz not null,          -- ChatMessage.timestamp
  created_at timestamptz not null default now(),
  primary key (user_id, local_date, position)
);
create index if not exists chat_messages_user_date_idx on public.chat_messages (user_id, local_date);

-- ─── food_reference (GLOBAL, confirmed-values-only) ───────────────────────────
create table if not exists public.food_reference (
  id              uuid primary key default gen_random_uuid(),
  normalized_name text not null,
  unit            text not null default 'serving',  -- "serving" | "100g" | "1 cup" ...
  calories        int not null,
  protein         double precision not null,
  confirmations   int not null default 1,
  created_by      uuid default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (normalized_name, unit)
);
create index if not exists food_reference_name_idx on public.food_reference (normalized_name);
