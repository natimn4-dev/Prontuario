export type OAuthBootstrapObservation = {
  status: number;
  redirect?: boolean;
  url?: string;
  setCookies: readonly string[];
};

export type OAuthBootstrapCheck =
  | { ok: true; target: string }
  | { ok: false; reason: string };

export function validateGoogleOAuthBootstrap(
  observation: OAuthBootstrapObservation,
): OAuthBootstrapCheck {
  if (observation.status !== 200) {
    return {
      ok: false,
      reason: `/api/auth/sign-in/social não iniciou OAuth Google: HTTP ${observation.status}.`,
    };
  }

  if (observation.redirect !== true || !observation.url) {
    return {
      ok: false,
      reason: "/api/auth/sign-in/social não retornou URL de redirecionamento OAuth.",
    };
  }

  let target: URL;
  try {
    target = new URL(observation.url);
  } catch {
    return { ok: false, reason: "Better Auth retornou URL OAuth inválida." };
  }

  if (target.protocol !== "https:" || target.hostname !== "accounts.google.com") {
    return {
      ok: false,
      reason: `Better Auth não iniciou Google OAuth (${target.origin}).`,
    };
  }

  if (!target.searchParams.get("state")) {
    return {
      ok: false,
      reason: "Google OAuth foi iniciado sem parâmetro state.",
    };
  }

  if (observation.setCookies.length === 0) {
    return {
      ok: false,
      reason: "Better Auth iniciou OAuth sem Set-Cookie; o callback pode falhar com state_mismatch.",
    };
  }

  return { ok: true, target: target.toString() };
}
