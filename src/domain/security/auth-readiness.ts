import { parseEmailSet } from "./auth-policy.ts";

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
    appUrlHttps: boolean;
    betterAuthSecretConfigured: boolean;
    googleClientIdConfigured: boolean;
    googleClientSecretConfigured: boolean;
    allowlistConfigured: boolean;
    bootstrapAdminConfigured: boolean;
  };
}

function isHttpsUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function configured(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

export function buildPublicAuthReadiness(env: AuthReadinessEnvironment): PublicAuthReadiness {
  const checks = {
    appUrlHttps: isHttpsUrl(env.appUrl),
    betterAuthSecretConfigured: configured(env.betterAuthSecret) && (env.betterAuthSecret?.length ?? 0) >= 32,
    googleClientIdConfigured: configured(env.googleClientId) && env.googleClientId!.endsWith(".apps.googleusercontent.com"),
    googleClientSecretConfigured: configured(env.googleClientSecret),
    allowlistConfigured: parseEmailSet(env.allowedEmails).size > 0,
    bootstrapAdminConfigured: parseEmailSet(env.bootstrapAdminEmails).size > 0,
  };

  return {
    status: Object.values(checks).every(Boolean) ? "ready" : "incomplete",
    checks,
  };
}
