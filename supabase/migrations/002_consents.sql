-- youly — durable, per-user, versioned consent
--
-- Why: consent was tracked in localStorage only, and inconsistently. lib/storage.ts
-- defined `arc_consent_<uid>` and hasConsented() read it, but app/consent/page.tsx
-- wrote the UN-keyed `arc_consent_done` and nothing ever read that. So consent was
-- device-global, unattributable to a user, never enforced, and erasable by the same
-- Safari 7-day script-writable-storage cap that already forced chat history into
-- Postgres (commit 6bd2a7f).
--
-- Why its own table and NOT columns on `profiles`: consent is recorded BEFORE
-- onboarding creates the profile. A consent-only `profiles` row would make
-- loadProfile() return non-null, which makes migrateProfile() (lib/migrate.ts)
-- conclude "profile already exists", set the migrated flag, and skip legacy
-- profile_backups recovery forever — silently losing a returning user's profile.
--
-- Versioned so consent can be re-collected when the policy text changes.

create table if not exists public.user_consents (
  user_id         uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  terms_version   text        not null,
  privacy_version text        not null,
  accepted_at     timestamptz not null default now(),
  user_agent      text
);

alter table public.user_consents enable row level security;

drop policy if exists "user_consents_select" on public.user_consents;
drop policy if exists "user_consents_insert" on public.user_consents;
drop policy if exists "user_consents_update" on public.user_consents;
drop policy if exists "user_consents_delete" on public.user_consents;

create policy "user_consents_select" on public.user_consents for select using (user_id = auth.uid());
create policy "user_consents_insert" on public.user_consents for insert with check (user_id = auth.uid());
create policy "user_consents_update" on public.user_consents for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "user_consents_delete" on public.user_consents for delete using (user_id = auth.uid());
