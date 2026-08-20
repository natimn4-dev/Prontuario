import { parseEmailSet } from "./auth-policy.ts";
import {
  isCanonicalProductionAppUrl,
  isGoogleOAuthClientId,
  isNonPlaceholderConfigValue,
} from "./environment.ts";

export interface AuthReadinessEnvironment {
  appUrl?: string;
  betterAuthSecret?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  allowedEmails?: string;
  bootstrapAdminEmails?: string;
}

export interface PublicAuthReadiness {
  status: "ready" | "incomplete";
  checks: {
    appUrlCanonical: boolean;
    betterAuthSecretConfigured: boolean;
    googleClientIdConfigured: boolean;
    googleClientSecretConfigured: boolean;
    allowlistConfigured: boolean;
    bootstrapAdminConfigured: boolean;
    bootstrapAdminAllowed: boolean;
  };
}

export function buildPublicAuthReadiness(env: AuthReadinessEnvironment): PublicAuthReadiness {
  const allowed = parseEmailSet(env.allowedEmails);
  const bootstrap = parseEmailSet(env.bootstrapAdminEmails);
  const bootstrapAdminAllowed = bootstrap.size > 0 && [...bootstrap].every((email) => allowed.has(email));

  const checks = {
    appUrlCanonical: isCanonicalProductionAppUrl(env.appUrl),
    betterAuthSecretConfigured:
      isNonPlaceholderConfigValue(env.betterAuthSecret) && (env.betterAuthSecret?.length ?? 0) >= 32,
    googleClientIdConfigured: isGoogleOAuthClientId(env.googleClientId),
    googleClientSecretConfigured: isNonPlaceholderConfigValue(env.googleClientSecret),
    allowlistConfigured: allowed.size > 0,
    bootstrapAdminConfigured: bootstrap.size > 0,
    bootstrapAdminAllowed,
  };

  return {
    status: Object.values(checks).every(Boolean) ? "ready" : "incomplete",
    checks,
  };
}
