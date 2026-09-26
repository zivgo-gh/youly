import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Consent state, stored per-user in Postgres (see supabase/migrations/002_consents.sql).
 *
 * Bump these when the policy text in components/legal/TermsContent changes — a
 * user whose stored version is older than the current one is re-prompted.
 */
export const TERMS_VERSION = "2026-08-01";
export const PRIVACY_VERSION = "2026-08-01";

export type ConsentStatus =
  | { status: "ok" }
  | { status: "missing" }
  | { status: "stale" }
  | { status: "error"; message: string };

/**
 * Reads consent for a user.
 *
 * The "error" case is deliberately distinct from "missing", and callers MUST NOT
 * collapse them. Treating an unreadable row as an absent row is the same class of
 * bug that lib/resolve-profile.ts exists to prevent: it would re-prompt (or worse,
 * re-gate) a user who has already consented, every time the network hiccups.
 */
export async function getConsent(
  supabase: SupabaseClient,
  uid: string
): Promise<ConsentStatus> {
  const { data, error } = await supabase
    .from("user_consents")
    .select("terms_version, privacy_version")
    .eq("user_id", uid)
    .maybeSingle();

  if (error) return { status: "error", message: error.message };
  if (!data) return { status: "missing" };

  if (
    data.terms_version !== TERMS_VERSION ||
    data.privacy_version !== PRIVACY_VERSION
  ) {
    return { status: "stale" };
  }

  return { status: "ok" };
}

/** Records (or re-records, on a policy bump) consent for a user. */
export async function recordConsent(
  supabase: SupabaseClient,
  uid: string
): Promise<void> {
  const { error } = await supabase.from("user_consents").upsert(
    {
      user_id: uid,
      terms_version: TERMS_VERSION,
      privacy_version: PRIVACY_VERSION,
      accepted_at: new Date().toISOString(),
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent : null,
    },
    { onConflict: "user_id" }
  );

  if (error) throw new Error(`Failed to record consent: ${error.message}`);
}
