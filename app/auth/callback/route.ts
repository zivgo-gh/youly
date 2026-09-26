import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  // The provider can come back with an error instead of a code (user cancelled,
  // consent screen denied, misconfigured client). This used to be ignored
  // entirely and the user was redirected as if sign-in had worked.
  const providerError =
    searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", "oauth");
    return NextResponse.redirect(url);
  }

  const code = searchParams.get("code");
  if (!code) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", "missing_code");
    return NextResponse.redirect(url);
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const url = new URL("/login", origin);
    url.searchParams.set("error", "exchange");
    return NextResponse.redirect(url);
  }

  // Only internal app paths are honoured, so a crafted ?next= can't turn this
  // into an open redirect.
  const requested = searchParams.get("next") ?? "";
  const destination = requested.startsWith("/app") ? requested : "/app";

  return NextResponse.redirect(new URL(destination, origin));
}
