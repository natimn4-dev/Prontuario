import assert from "node:assert/strict";
import test from "node:test";
import { validateGoogleOAuthBootstrap } from "../../src/domain/oauth-bootstrap-smoke.ts";

const validGoogleUrl = "https://accounts.google.com/o/oauth2/v2/auth?client_id=test&state=state-123";

test("aceita bootstrap Google com state e Set-Cookie", () => {
  assert.deepEqual(
    validateGoogleOAuthBootstrap({
      status: 200,
      redirect: true,
      url: validGoogleUrl,
      setCookies: ["better-auth.state=abc; Path=/; HttpOnly; Secure; SameSite=Lax"],
    }),
    { ok: true, target: validGoogleUrl },
  );
});

test("bloqueia OAuth sem state", () => {
  assert.deepEqual(
    validateGoogleOAuthBootstrap({
      status: 200,
      redirect: true,
      url: "https://accounts.google.com/o/oauth2/v2/auth?client_id=test",
      setCookies: ["better-auth.state=abc; Path=/; HttpOnly; Secure; SameSite=Lax"],
    }),
    { ok: false, reason: "Google OAuth foi iniciado sem parâmetro state." },
  );
});

test("bloqueia OAuth sem Set-Cookie para correlacionar callback", () => {
  assert.deepEqual(
    validateGoogleOAuthBootstrap({
      status: 200,
      redirect: true,
      url: validGoogleUrl,
      setCookies: [],
    }),
    {
      ok: false,
      reason: "Better Auth iniciou OAuth sem Set-Cookie; o callback pode falhar com state_mismatch.",
    },
  );
});

test("rejeita redirecionamento para origem que não seja Google", () => {
  assert.deepEqual(
    validateGoogleOAuthBootstrap({
      status: 200,
      redirect: true,
      url: "https://example.test/oauth?state=state-123",
      setCookies: ["state=abc"],
    }),
    { ok: false, reason: "Better Auth não iniciou Google OAuth (https://example.test)." },
  );
});
