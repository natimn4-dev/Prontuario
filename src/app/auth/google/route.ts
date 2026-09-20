import { NextResponse } from "next/server";
import {
  renderGoogleOAuthContinuationPage,
  validateGoogleOAuthTarget,
} from "@/domain/google-oauth-continuation";
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

function applyNoStoreHeaders(headers: Headers) {
  headers.set("cache-control", "private, no-store, max-age=0");
  headers.set("pragma", "no-cache");
  headers.set("expires", "0");
}

export async function GET(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const manualMode = requestUrl.searchParams.get("manual") === "1";

    const { headers: authHeaders, response: result } = await auth.api.signInSocial({
      body: {
        provider: "google",
        callbackURL: "/",
        errorCallbackURL: "/auth/error",
      },
      headers: request.headers,
      returnHeaders: true,
    });

    if (!result.url) {
      return NextResponse.redirect(new URL("/auth/error?error=oauth_start", request.url), 303);
    }

    const googleTarget = validateGoogleOAuthTarget(result.url);

    if (!manualMode) {
      const response = NextResponse.redirect(googleTarget, 303);
      applyNoStoreHeaders(response.headers);
      appendSetCookies(authHeaders, response.headers);
      return response;
    }

    const headers = new Headers({
      "content-type": "text/html; charset=utf-8",
      "referrer-policy": "no-referrer",
      "x-content-type-options": "nosniff",
      "content-security-policy": "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; frame-ancestors 'none'",
    });
    applyNoStoreHeaders(headers);
    appendSetCookies(authHeaders, headers);

    return new Response(renderGoogleOAuthContinuationPage(googleTarget), {
      status: 200,
      headers,
    });
  } catch {
    return NextResponse.redirect(new URL("/auth/error?error=oauth_start", request.url), 303);
  }
}
