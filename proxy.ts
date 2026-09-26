import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseProxyClient } from "@/lib/supabase-server";

// Everything under this prefix requires a session. Using a prefix rather than a
// list of page paths is the point: /meals used to be unprotected purely because
// somebody forgot to add it to an array. A new gated page can no longer be born
// unprotected.
const GATED_PREFIX = "/app";

// Not `startsWith("/app")` — that would also swallow a future /approach or
// /apply marketing page.
function isGated(pathname: string) {
  return pathname === GATED_PREFIX || pathname.startsWith(`${GATED_PREFIX}/`);
}

export async function proxy(request: NextRequest) {
  const { supabase, getResponse } = createSupabaseProxyClient(request);

  // Also refreshes the session cookie as a side effect, which is why the matcher
  // below must keep covering /app/* and /auth/*.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname, search } = request.nextUrl;

  if (!user && isGated(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    // Come back to where they were actually headed after signing in.
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/app";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return getResponse();
}

export const config = {
  // Deliberately narrow. Proxy is Node-runtime in Next 16 and cannot be moved to
  // the edge, so every matched request is a serverless invocation plus a Supabase
  // getUser() round-trip. The previous matcher was "every path except assets",
  // which meant paying that on every crawler hit of every marketing page — and on
  // /robots.txt.
  //
  // "/" is intentionally absent: the homepage is static marketing for everyone,
  // signed in or not, and is served straight from the CDN.
  //
  // api/ is also absent, which is why every route handler authenticates itself
  // via lib/auth-server.ts. Per the Next 16 proxy docs, authorization must never
  // depend on the proxy alone.
  matcher: ["/app/:path*", "/login", "/auth/:path*"],
};
