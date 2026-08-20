import { parseEmailSet } from "./auth-policy.ts";

export interface ProductionEnvironment {
  nodeEnv?: string;
  appUrl?: string;
  databaseUrl?: string;
  betterAuthSecret?: string;
  googleClientId?: string;
  googleClientSecret?: string;
  allowedEmails?: string;
  bootstrapAdminEmails?: string;
}

export interface EnvironmentValidation {
  ok: boolean;
  errors: string[];
}

export function isNonPlaceholderConfigValue(value: string | undefined): boolean {
  if (!value?.trim()) return false;
  return !/(trocar|change|example|your-|placeholder)/i.test(value);
}

function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1";
}

export function isCanonicalProductionAppUrl(value: string | undefined): boolean {
  if (!value) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && !isLoopbackHostname(url.hostname)
      && !url.username
      && !url.password
      && !url.search
      && !url.hash
      && url.pathname === "/";
  } catch {
    return false;
  }
}

export function isGoogleOAuthClientId(value: string | undefined): boolean {
  return isNonPlaceholderConfigValue(value)
    && Boolean(value?.trim().endsWith(".apps.googleusercontent.com"));
}

function validateAppUrl(value: string, production: boolean, errors: string[]): void {
  try {
    const url = new URL(value);
    if (production && url.protocol !== "https:") errors.push("APP_URL deve usar HTTPS em produção.");
    if (production && isLoopbackHostname(url.hostname)) errors.push("APP_URL não pode apontar para localhost/loopback em produção.");
    if (url.username || url.password) errors.push("APP_URL não pode conter credenciais embutidas.");
    if (url.search || url.hash) errors.push("APP_URL deve representar apenas a origem, sem query string ou fragmento.");
    if (url.pathname !== "/") errors.push("APP_URL deve representar apenas a origem, sem caminho adicional.");
  } catch {
    errors.push("APP_URL inválida.");
  }
}

export function validateProductionEnvironment(env: ProductionEnvironment): EnvironmentValidation {
  const errors: string[] = [];
  const production = env.nodeEnv === "production";

  if (!env.appUrl) {
    errors.push("APP_URL é obrigatória.");
  } else {
    validateAppUrl(env.appUrl, production, errors);
  }

  if (!env.databaseUrl?.startsWith("mysql://")) {
    errors.push("DATABASE_URL deve usar mysql://.");
  }

  if (!isNonPlaceholderConfigValue(env.betterAuthSecret) || (env.betterAuthSecret?.length ?? 0) < 32) {
    errors.push("BETTER_AUTH_SECRET deve ser não previsível e ter pelo menos 32 caracteres.");
  }
  if (!isNonPlaceholderConfigValue(env.googleClientId)) {
    errors.push("GOOGLE_CLIENT_ID é obrigatório.");
  } else if (!isGoogleOAuthClientId(env.googleClientId)) {
    errors.push("GOOGLE_CLIENT_ID deve ter o formato de um OAuth Client ID do Google.");
  }
  if (!isNonPlaceholderConfigValue(env.googleClientSecret)) errors.push("GOOGLE_CLIENT_SECRET é obrigatório.");

  const allowed = parseEmailSet(env.allowedEmails);
  const bootstrap = parseEmailSet(env.bootstrapAdminEmails);
  if (allowed.size === 0) errors.push("AUTH_ALLOWED_EMAILS não pode ficar vazia.");
  if (bootstrap.size === 0) errors.push("AUTH_BOOTSTRAP_ADMIN_EMAILS deve conter ao menos um administrador inicial.");
  for (const email of bootstrap) {
    if (!allowed.has(email)) errors.push(`Administrador bootstrap fora da allowlist: ${email}.`);
  }

  return { ok: errors.length === 0, errors };
}

export function assertProductionEnvironment(env: ProductionEnvironment): void {
  const result = validateProductionEnvironment(env);
  if (!result.ok) throw new Error(`Configuração de produção insegura:\n- ${result.errors.join("\n- ")}`);
}
