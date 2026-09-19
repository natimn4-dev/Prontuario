export type CiE2EAuthEnvironment = {
  CI?: string;
  NODE_ENV?: string;
  APP_URL?: string;
  DATABASE_URL?: string;
  TEST_DATABASE_URL?: string;
  E2E_AUTH_ENABLED?: string;
  E2E_AUTH_SECRET?: string;
};

function databaseLooksEphemeral(value: string): boolean {
  try {
    const url = new URL(value);
    return /(?:^|[_-])(ci|test)(?:$|[_-])/i.test(url.pathname.replace(/^\//, ""));
  } catch {
    return false;
  }
}

export function isSyntheticCiEmail(email: string): boolean {
  return /^ci-e2e-[a-z0-9-]+@example\.com$/i.test(email.trim());
}

export function isCiE2EAuthEnvironment(env: CiE2EAuthEnvironment = process.env): boolean {
  if (env.CI !== "true" || env.E2E_AUTH_ENABLED !== "1") return false;
  if (!env.NODE_ENV || env.NODE_ENV === "production") return false;
  if (!env.APP_URL || !env.DATABASE_URL || !env.TEST_DATABASE_URL) return false;
  if (env.DATABASE_URL !== env.TEST_DATABASE_URL) return false;
  if (!env.E2E_AUTH_SECRET || env.E2E_AUTH_SECRET.length < 32) return false;

  try {
    const app = new URL(env.APP_URL);
    const loopback = app.hostname === "127.0.0.1" || app.hostname === "localhost" || app.hostname === "::1";
    if (!loopback || app.protocol !== "http:") return false;
  } catch {
    return false;
  }

  return databaseLooksEphemeral(env.DATABASE_URL);
}
