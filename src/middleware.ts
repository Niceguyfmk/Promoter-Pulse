import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/shared/supabase/database.types";

const protectedPrefixes = ["/promoter", "/manager", "/admin", "/api"];
const publicPrefixes = ["/login", "/manifest.webmanifest", "/sw.js", "/icons"];

function isProtectedPath(pathname: string): boolean {
  return protectedPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function isPublicPath(pathname: string): boolean {
  return publicPrefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-request-id", requestHeaders.get("x-request-id") ?? crypto.randomUUID());

  // Older Supabase configuration used `/*` as the Site URL. Recovery links
  // generated with that value land on a literal `/*` path with the session in
  // the URL fragment. Redirect it to the password form; browsers carry the
  // fragment across this redirect so the Supabase browser client can consume it.
  if (request.nextUrl.pathname === "/*") {
    return NextResponse.redirect(new URL("/set-password", request.url));
  }

  if (isPublicPath(request.nextUrl.pathname)) {
    return NextResponse.next({
      request: {
        headers: requestHeaders
      }
    });
  }

  let response = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request: {
              headers: requestHeaders
            }
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        }
      }
    }
  );

  if (isProtectedPath(request.nextUrl.pathname)) {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
