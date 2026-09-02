import { CLINICAL_RELEASE_ID } from "../src/domain/clinical-release.ts";
import { validateGoogleOAuthBootstrap } from "../src/domain/oauth-bootstrap-smoke.ts";
import { PROGRAM55_MAX_AGE, PROGRAM55_MIN_AGE } from "../src/domain/program55/eligibility.ts";

const REQUEST_TIMEOUT_MS = 15_000;

function blocked(message: string): never {
  console.error("CLINICAL_RELEASE=BLOCKED");
  console.error(`- ${message}`);
  process.exit(1);
}

function productionBaseUrl(): URL {
  const value = process.env.APP_URL;
  if (!value) blocked("APP_URL não configurada.");
  let url: URL;
  try { url = new URL(value); } catch { blocked("APP_URL inválida."); }
  if (url.protocol !== "https:") blocked("APP_URL precisa usar HTTPS.");
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

async function request(base: URL, path: string, redirect: RequestRedirect = "manual") {
  const url = new URL(path, base);
  return fetch(url, {
    method: "GET",
    redirect,
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      "cache-control": "no-cache",
      "user-agent": "prontuario-clinical-release-smoke/1.9",
    },
  });
}

function responseCookies(response: Response): string[] {
  return typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : response.headers.get("set-cookie")
      ? [response.headers.get("set-cookie") as string]
      : [];
}

async function startGoogleOAuth(base: URL) {
  const url = new URL("/api/auth/sign-in/social", base);
  const response = await fetch(url, {
    method: "POST",
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      "cache-control": "no-cache",
      "content-type": "application/json",
      "user-agent": "prontuario-clinical-release-smoke/1.9",
    },
    body: JSON.stringify({ provider: "google", callbackURL: "/", errorCallbackURL: "/login?error=google" }),
  });

  const body = await response.json().catch(() => null) as { redirect?: boolean; url?: string } | null;
  const check = validateGoogleOAuthBootstrap({ status: response.status, redirect: body?.redirect, url: body?.url, setCookies: responseCookies(response) });
  if (!check.ok) blocked(check.reason);
}

async function startGoogleOAuthViaPublicEntrypoint(base: URL) {
  const response = await request(base, "/auth/google", "manual");
  if (response.status !== 200) blocked(`/auth/google respondeu HTTP ${response.status}; o ponto de entrada público do OAuth está indisponível.`);
  const cacheControl = response.headers.get("cache-control")?.toLowerCase() ?? "";
  if (!cacheControl.includes("no-store")) blocked("/auth/google não confirmou Cache-Control: no-store.");
  if (responseCookies(response).length === 0) blocked("/auth/google não encaminhou Set-Cookie do state/PKCE.");
  const html = await response.text();
  if (!html.includes('data-google-oauth-continuation="true"')) blocked("/auth/google não apresentou continuação navegável para o Google.");
  if (!html.includes('data-google-oauth-user-gesture="true"') || !html.includes('target="_top"')) blocked("/auth/google não exige continuação por gesto explícito do usuário no contexto superior.");
  if (html.toLowerCase().includes('http-equiv="refresh"') || /window\.location|location\.replace|location\.assign/i.test(html)) blocked("/auth/google voltou a conter redirecionamento automático, incompatível com navegadores internos.");
  if (!html.includes('data-google-oauth-browser-restart="true"') || !html.includes('/auth/google?fresh=1')) blocked("/auth/google não oferece fallback para novo contexto de navegador.");
  if (!html.includes("https://accounts.google.com/") || !html.includes("state=")) blocked("/auth/google não contém destino Google HTTPS com state.");
}

const base = productionBaseUrl();

try {
  const health = await request(base, "/api/health", "follow");
  if (health.status !== 200) blocked(`/api/health respondeu HTTP ${health.status}.`);
  const healthCacheControl = health.headers.get("cache-control")?.toLowerCase() ?? "";
  if (!healthCacheControl.includes("no-store")) blocked("/api/health não confirmou Cache-Control: no-store; a release pode estar sendo validada por resposta intermediária antiga.");
  const healthBody = await health.json().catch(() => null) as {
    status?: string;
    database?: string;
    releaseId?: string;
    program55?: { enabled?: boolean; minAge?: number; maxAge?: number; schemaReady?: boolean };
  } | null;
  if (healthBody?.status !== "ok" || healthBody.database !== "ok") blocked("/api/health não confirmou aplicação e banco em estado ok.");
  if (healthBody.releaseId !== CLINICAL_RELEASE_ID) blocked(`/api/health está saudável, mas executa release diferente da esperada (${healthBody.releaseId ?? "sem releaseId"}).`);
  if (
    healthBody.program55?.enabled !== true ||
    healthBody.program55.minAge !== PROGRAM55_MIN_AGE ||
    healthBody.program55.maxAge !== PROGRAM55_MAX_AGE ||
    healthBody.program55.schemaReady !== true
  ) {
    blocked("/api/health não confirmou Programa 55+ ativo, faixa 55–70 e schema longitudinal pronto.");
  }

  const assets = await request(base, "/api/health/assets", "follow");
  if (assets.status !== 200) blocked(`/api/health/assets respondeu HTTP ${assets.status}.`);
  const assetsBody = await assets.json().catch(() => null) as { status?: string; localAssets?: { cssPresent?: boolean; jsPresent?: boolean }; publicDelivery?: { cssStatus?: number | null; jsStatus?: number | null } } | null;
  if (assetsBody?.status !== "ok") blocked("/api/health/assets não confirmou estado ok.");
  if (assetsBody.localAssets?.cssPresent !== true || assetsBody.localAssets?.jsPresent !== true) blocked("Build publicado não contém CSS e JavaScript do Next.js.");
  if (assetsBody.publicDelivery?.cssStatus !== 200 || assetsBody.publicDelivery?.jsStatus !== 200) blocked(`Hostinger não está entregando assets estáticos corretamente (CSS ${assetsBody.publicDelivery?.cssStatus ?? "sem status"}; JS ${assetsBody.publicDelivery?.jsStatus ?? "sem status"}).`);

  const authHealth = await request(base, "/api/health/auth", "follow");
  if (authHealth.status !== 200) blocked(`/api/health/auth respondeu HTTP ${authHealth.status}.`);
  const authHealthBody = await authHealth.json().catch(() => null) as { status?: string } | null;
  if (authHealthBody?.status !== "ready") blocked("/api/health/auth não confirmou prontidão estática do OAuth.");

  const login = await request(base, "/login", "follow");
  if (login.status !== 200) blocked(`/login respondeu HTTP ${login.status}.`);
  const loginHtml = await login.text();
  if (!loginHtml.includes("Entrar com Google")) blocked("/login não contém a ação de autenticação Google.");

  await startGoogleOAuth(base);
  await startGoogleOAuthViaPublicEntrypoint(base);

  for (const path of ["/patients", "/patients/new", "/programa-55"]) {
    const protectedResponse = await request(base, path, "manual");
    if (protectedResponse.status === 200) blocked(`${path} ficou acessível anonimamente.`);
    if (![301, 302, 303, 307, 308, 401, 403].includes(protectedResponse.status)) blocked(`${path} apresentou comportamento inesperado para acesso anônimo: HTTP ${protectedResponse.status}.`);
    const protectedCacheControl = protectedResponse.headers.get("cache-control")?.toLowerCase() ?? "";
    if (!protectedCacheControl.includes("no-store") || !protectedCacheControl.includes("private")) blocked(`${path} não bloqueou cache compartilhado na resposta de acesso anônimo.`);
  }
} catch (error) {
  if (error instanceof Error && error.message.includes("CLINICAL_RELEASE")) throw error;
  blocked("Falha de rede/DNS/TLS ou timeout durante o smoke test do domínio de produção.");
}

console.log("CLINICAL_RELEASE=SMOKE_OK");
console.log(`- HTTPS acessível: ${base.origin}`);
console.log(`- release confirmada: ${CLINICAL_RELEASE_ID}`);
console.log("- /api/health confirmou banco ok e resposta não cacheável");
console.log(`- Programa 55+ confirmado ativo para ${PROGRAM55_MIN_AGE}–${PROGRAM55_MAX_AGE} anos e schema longitudinal pronto`);
console.log("- /api/health/auth confirmou prontidão estática do OAuth");
console.log("- CSS e JavaScript do Next.js presentes e entregues com HTTP 200");
console.log("- /login contém ação de autenticação Google");
console.log("- endpoint canônico do Better Auth iniciou Google OAuth com state e Set-Cookie");
console.log("- /auth/google exige gesto explícito, sem auto-redirecionamento, e preserva state/PKCE");
console.log("- /auth/google oferece fallback de novo contexto para navegadores internos");
console.log("- rotas clínicas, incluindo /programa-55, não estão abertas anonimamente");
