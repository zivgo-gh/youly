/**
 * Distinguishes "there is no session" from "the auth check failed".
 *
 * `supabase.auth.getUser()` does NOT return `{ user: null, error: null }` when a
 * visitor is signed out. It returns an `AuthSessionMissingError`, and it does so by
 * short-circuiting *before* any network request — which is why a signed-out visitor
 * generates zero auth traffic in the Supabase dashboard.
 *
 * Conflating the two is not hypothetical: production showed "Couldn't load your
 * account" to every logged-out visitor, because the old gate read
 * `if (authError && !user)` as "the server is unreachable" and rendered its failure
 * state instead of sending them to sign in. It logged nothing, because that branch
 * had no logging.
 *
 * Matching on `name` is precisely what supabase's own `isAuthSessionMissingError`
 * does; it is not re-exported from `@supabase/supabase-js`, so we don't import it
 * from the transitive package.
 */
export function isSessionMissing(
  error: { name?: string } | null | undefined
): boolean {
  return error?.name === "AuthSessionMissingError";
}

/** True only for a genuine failure to complete the auth check. */
export function isRealAuthFailure(
  error: { name?: string } | null | undefined
): boolean {
  return Boolean(error) && !isSessionMissing(error);
}
