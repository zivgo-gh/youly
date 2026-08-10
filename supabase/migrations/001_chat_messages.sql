-- Delta migration: persist chat history.
-- Run this ONCE in the Supabase SQL editor against an already-provisioned database.
-- (schema.sql + rls.sql already include this table, so a fresh provision does not need it.)
--
-- Why: chat history lived only in localStorage (`arc_chat_<uid>_<date>`), and Safari's
-- 7-day cap on script-writable storage deletes that after any week-long gap. Food, weight
-- and profile data survived because they're in Postgres; conversations were being lost.

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

alter table public.chat_messages enable row level security;

drop policy if exists "chat_messages_select" on public.chat_messages;
drop policy if exists "chat_messages_insert" on public.chat_messages;
drop policy if exists "chat_messages_update" on public.chat_messages;
drop policy if exists "chat_messages_delete" on public.chat_messages;

create policy "chat_messages_select" on public.chat_messages for select using (user_id = auth.uid());
create policy "chat_messages_insert" on public.chat_messages for insert with check (user_id = auth.uid());
create policy "chat_messages_update" on public.chat_messages for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "chat_messages_delete" on public.chat_messages for delete using (user_id = auth.uid());
