import { NextResponse } from "next/server";
import { auth } from "@/server/auth/auth";

function appendSetCookies(source: Headers, target: Headers) {
  const sourceWithGetSetCookie = source as Headers & {
    getSetCookie?: () => string[];
  };
  const cookies = sourceWithGetSetCookie.getSetCookie?.() ?? [];

  if (cookies.length > 0) {
    for (const cookie of cookies) {
      target.append("set-cookie", cookie);
    }
    return;
  }

  const cookie = source.get("set-cookie");
  if (cookie) target.append("set-cookie", cookie);
}

export async function GET(request: Request) {
  try {
    const { headers: authHeaders, response: result } = await auth.api.signInSocial({
      body: {
        provider: "google",
        callbackURL: "/",
        errorCallbackURL: "/login?error=google",
      },
      headers: request.headers,
      returnHeaders: true,
    });

    if (!result.url) {
      return NextResponse.redirect(new URL("/login?error=oauth_start", request.url), 303);
    }

    const redirect = NextResponse.redirect(result.url, 303);
    appendSetCookies(authHeaders, redirect.headers);
    return redirect;
  } catch {
    return NextResponse.redirect(new URL("/login?error=oauth_start", request.url), 303);
  }
}
