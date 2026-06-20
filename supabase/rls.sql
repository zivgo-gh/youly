-- youly (Arc) — Row Level Security
-- Run this AFTER schema.sql. With the anon key, RLS is the entire security boundary.
-- Per-user tables: a row is visible/writable only by its owner (user_id = auth.uid()).
-- food_reference: readable AND writable by any authenticated user (it is a shared, global table).

-- ─── profiles ─────────────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
create policy "profiles_select" on public.profiles for select using (user_id = auth.uid());
create policy "profiles_insert" on public.profiles for insert with check (user_id = auth.uid());
create policy "profiles_update" on public.profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "profiles_delete" on public.profiles for delete using (user_id = auth.uid());

-- ─── food_entries ─────────────────────────────────────────────────────────────
alter table public.food_entries enable row level security;
create policy "food_entries_select" on public.food_entries for select using (user_id = auth.uid());
create policy "food_entries_insert" on public.food_entries for insert with check (user_id = auth.uid());
create policy "food_entries_update" on public.food_entries for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "food_entries_delete" on public.food_entries for delete using (user_id = auth.uid());

-- ─── weights ──────────────────────────────────────────────────────────────────
alter table public.weights enable row level security;
create policy "weights_select" on public.weights for select using (user_id = auth.uid());
create policy "weights_insert" on public.weights for insert with check (user_id = auth.uid());
create policy "weights_update" on public.weights for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "weights_delete" on public.weights for delete using (user_id = auth.uid());

-- ─── saved_meals ──────────────────────────────────────────────────────────────
alter table public.saved_meals enable row level security;
create policy "saved_meals_select" on public.saved_meals for select using (user_id = auth.uid());
create policy "saved_meals_insert" on public.saved_meals for insert with check (user_id = auth.uid());
create policy "saved_meals_update" on public.saved_meals for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "saved_meals_delete" on public.saved_meals for delete using (user_id = auth.uid());

-- ─── saved_meal_items (scoped by its own user_id — no join needed) ─────────────
alter table public.saved_meal_items enable row level security;
create policy "saved_meal_items_select" on public.saved_meal_items for select using (user_id = auth.uid());
create policy "saved_meal_items_insert" on public.saved_meal_items for insert with check (user_id = auth.uid());
create policy "saved_meal_items_update" on public.saved_meal_items for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "saved_meal_items_delete" on public.saved_meal_items for delete using (user_id = auth.uid());

-- ─── food_reference (GLOBAL: read + write open to all authenticated users) ─────
alter table public.food_reference enable row level security;
create policy "food_reference_select" on public.food_reference for select using (auth.role() = 'authenticated');
create policy "food_reference_insert" on public.food_reference for insert with check (auth.role() = 'authenticated');
create policy "food_reference_update" on public.food_reference for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');
