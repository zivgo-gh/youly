-- ─────────────────────────────────────────────────────────────────────────────
-- Transfer every row owned by one account to another.
--
-- WHY THIS CAN ONLY RUN HERE: every RLS policy is `user_id = auth.uid()` with a
-- matching WITH CHECK, so an UPDATE that changes user_id from A to B would need
-- the caller to be signed in as A (to pass USING) and as B (to pass WITH CHECK)
-- at the same time. Impossible from the app. The SQL editor runs privileged and
-- bypasses RLS, which is exactly why this file is a manual, deliberate operation
-- and not something the product can do to itself.
--
-- PREREQUISITE: the destination account must already exist in auth.users — sign
-- in with it once first. Every table has a foreign key to auth.users(id), so the
-- transfer fails cleanly (not halfway) if it doesn't.
--
-- Run STEP 1 on its own first. It changes nothing and tells you whether STEP 2
-- will hit conflicts.
-- ─────────────────────────────────────────────────────────────────────────────


-- ═══ STEP 1 — INSPECT (read-only, safe to run any time) ══════════════════════

-- 1a. Which accounts exist, and which has been used recently?
select
  u.id,
  u.email,
  u.created_at,
  u.last_sign_in_at
from auth.users u
order by u.last_sign_in_at desc nulls last;

-- 1b. What does each account actually own?
--     Set the two emails here, then read the result before going further.
with accounts as (
  select
    (select id from auth.users where lower(email) = lower('support@youly.app'))   as src,
    (select id from auth.users where lower(email) = lower('zivgonen@gmail.com')) as dst
)
select t.tbl, t.source_rows, t.dest_rows
from accounts a
cross join lateral (
  values
    ('profiles',         (select count(*) from public.profiles         where user_id = a.src),
                         (select count(*) from public.profiles         where user_id = a.dst)),
    ('food_entries',     (select count(*) from public.food_entries     where user_id = a.src),
                         (select count(*) from public.food_entries     where user_id = a.dst)),
    ('weights',          (select count(*) from public.weights          where user_id = a.src),
                         (select count(*) from public.weights          where user_id = a.dst)),
    ('saved_meals',      (select count(*) from public.saved_meals      where user_id = a.src),
                         (select count(*) from public.saved_meals      where user_id = a.dst)),
    ('saved_meal_items', (select count(*) from public.saved_meal_items where user_id = a.src),
                         (select count(*) from public.saved_meal_items where user_id = a.dst)),
    ('chat_messages',    (select count(*) from public.chat_messages    where user_id = a.src),
                         (select count(*) from public.chat_messages    where user_id = a.dst)),
    ('user_consents',    (select count(*) from public.user_consents    where user_id = a.src),
                         (select count(*) from public.user_consents    where user_id = a.dst))
) as t(tbl, source_rows, dest_rows);

-- Read the dest_rows column. If every value is 0, STEP 2 is a clean move.
-- If any is non-zero, the destination already has its own data and STEP 2 will
-- DELETE it (see the flag below) — four tables key on user_id and would
-- otherwise collide on their primary key.


-- ═══ STEP 2 — TRANSFER (destructive; read STEP 1 first) ══════════════════════

do $$
declare
  -- ── set these three ──────────────────────────────────────────────────────
  src_email  text    := 'support@youly.app';    -- FROM: account that has the history
  dst_email  text    := 'zivgonen@gmail.com';   -- TO:   account that should own it
  -- true  = wipe whatever the destination already owns, then move
  -- false = abort if the destination owns anything (safer default)
  overwrite  boolean := false;
  -- ─────────────────────────────────────────────────────────────────────────
  src_id     uuid;
  dst_id     uuid;
  dst_rows   bigint;
  moved      bigint;
begin
  select id into src_id from auth.users where lower(email) = lower(src_email);
  select id into dst_id from auth.users where lower(email) = lower(dst_email);

  if src_id is null then
    raise exception 'Source account % not found in auth.users', src_email;
  end if;
  if dst_id is null then
    raise exception
      'Destination account % not found. Sign in with it once, then re-run.', dst_email;
  end if;
  if src_id = dst_id then
    raise exception 'Source and destination are the same account';
  end if;

  select
    (select count(*) from public.profiles      where user_id = dst_id)
  + (select count(*) from public.food_entries  where user_id = dst_id)
  + (select count(*) from public.weights       where user_id = dst_id)
  + (select count(*) from public.saved_meals   where user_id = dst_id)
  + (select count(*) from public.chat_messages where user_id = dst_id)
  into dst_rows;

  if dst_rows > 0 and not overwrite then
    raise exception
      'Destination % already owns % rows. Review STEP 1, then set overwrite := true to replace them.',
      dst_email, dst_rows;
  end if;

  if dst_rows > 0 then
    -- Children before parents: saved_meal_items has an FK to saved_meals(id).
    delete from public.saved_meal_items where user_id = dst_id;
    delete from public.saved_meals      where user_id = dst_id;
    delete from public.chat_messages    where user_id = dst_id;
    delete from public.food_entries     where user_id = dst_id;
    delete from public.weights          where user_id = dst_id;
    delete from public.user_consents    where user_id = dst_id;
    delete from public.profiles         where user_id = dst_id;
    raise notice 'Cleared % pre-existing rows from %', dst_rows, dst_email;
  end if;

  -- The move itself. Only user_id changes; every primary key that is a uuid
  -- (food_entries.id, saved_meals.id, saved_meal_items.id) keeps its value, so
  -- saved_meal_items stays attached to its meal.
  update public.profiles         set user_id = dst_id where user_id = src_id;
  get diagnostics moved = row_count; raise notice 'profiles:         %', moved;

  update public.food_entries     set user_id = dst_id where user_id = src_id;
  get diagnostics moved = row_count; raise notice 'food_entries:     %', moved;

  update public.weights          set user_id = dst_id where user_id = src_id;
  get diagnostics moved = row_count; raise notice 'weights:          %', moved;

  update public.saved_meals      set user_id = dst_id where user_id = src_id;
  get diagnostics moved = row_count; raise notice 'saved_meals:      %', moved;

  update public.saved_meal_items set user_id = dst_id where user_id = src_id;
  get diagnostics moved = row_count; raise notice 'saved_meal_items: %', moved;

  update public.chat_messages    set user_id = dst_id where user_id = src_id;
  get diagnostics moved = row_count; raise notice 'chat_messages:    %', moved;

  update public.user_consents    set user_id = dst_id where user_id = src_id;
  get diagnostics moved = row_count; raise notice 'user_consents:    %', moved;

  -- public.food_reference is deliberately untouched. It is a SHARED, global
  -- table readable and writable by every authenticated user; created_by is
  -- provenance only, has no foreign key, and reassigning it would be meaningless.

  raise notice 'Transfer complete: % -> %', src_email, dst_email;
end $$;


-- ═══ STEP 3 — VERIFY ═════════════════════════════════════════════════════════
-- Re-run STEP 1b. source_rows should now be 0 across the board and dest_rows
-- should hold the numbers the source had before.
--
-- Then, in the browser: sign out, sign in as the destination account, and check
-- that your history is there. The old account survives as an empty account; you
-- can leave it or delete it from Authentication -> Users (nothing cascades,
-- because nothing is owned by it any more).
