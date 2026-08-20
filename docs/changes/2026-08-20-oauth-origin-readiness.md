# OAuth production origin readiness

## Context

Google OAuth and Better Auth depend on a stable canonical application origin. A production `APP_URL` containing a path, query string, fragment, embedded credentials or loopback hostname can generate inconsistent callback/cookie origins and should fail before clinical release.

## Change

Production environment validation now requires `APP_URL` to be a canonical HTTPS origin only:

- HTTPS in production;
- no localhost/loopback host;
- no embedded username/password;
- no path beyond `/`;
- no query string or fragment.

`GOOGLE_CLIENT_ID` is also checked for the standard Google OAuth client ID suffix (`.apps.googleusercontent.com`). The Google client secret is still treated as opaque and is never logged or pattern-matched.

## Safety

- no authentication state, cookie, CSRF, PKCE or OAuth state validation is bypassed;
- no secret value is exposed;
- no patient or clinical data is read or modified;
- this is a fail-fast release/configuration guard only.

## Verification

Golden-master coverage was added for canonical origins, loopback rejection and malformed Google OAuth client IDs. Existing environment, security, build and integration checks remain unchanged.
