import { CLINICAL_RELEASE_ID } from "../src/domain/clinical-release.ts";
import { ONCOGERIATRIA_VERSION } from "../src/domain/oncogeriatria/feature.ts";
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
      "user-agent": "prontuario-clinical-release-smoke/2.1",
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

function safeHeader(response: Response, name: string): string {
  return response.headers.get(name) ?? "ausente";
}

function relevantLoginHrefs(html: string): string[] {
  return Array.from(html.matchAll(/href="([^"]+)"/g), (match) => match[1])
    .filter((href) => href.includes("auth") || href.includes("login"))
    .slice(0, 8);
}

async function logLoginDeliveryMismatch(base: URL, response: Response, html: string) {
  console.error("LOGIN_DELIVERY_DIAGNOSTIC");
  console.error(`- cache-control: ${safeHeader(response, "cache-control")}`);
  console.error(`- cdn-cache-control: ${safeHeader(response, "cdn-cache-control")}`);
  console.error(`- surrogate-control: ${safeHeader(response, "surrogate-control")}`);
  console.error(`- x-hcdn-cache-status: ${safeHeader(response, "x-hcdn-cache-status")}`);
  console.error(`- age: ${safeHeader(response, "age")}`);
  console.error(`- etag: ${safeHeader(response, "etag")}`);
  console.error(`- data-google-auth-entrypoint presente: ${html.includes('data-google-auth-entrypoint="true"')}`);
  const hrefs = relevantLoginHrefs(html);
  console.error(`- hrefs auth/login observados: ${hrefs.length > 0 ? hrefs.join(", ") : "nenhum"}`);

  try {
    const cacheBustingPath = `/login?release=${encodeURIComponent(CLINICAL_RELEASE_ID)}&smoke=${Date.now()}`;
    const fresh = await request(base, cacheBustingPath, "follow");
    const freshHtml = await fresh.text();
    console.error(`- cache-busting HTTP: ${fresh.status}`);
    console.error(`- cache-busting x-hcdn-cache-status: ${safeHeader(fresh, "x-hcdn-cache-status")}`);
    console.error(`- cache-busting contém href canônico: ${freshHtml.includes('href="/auth/google"')}`);
    console.error(`- cache-busting contém marcador vigente: ${freshHtml.includes('data-google-auth-entrypoint="true"')}`);
  } catch {
    console.error("- cache-busting: falha de rede ao diagnosticar representação fresca");
  }
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
      "user-agent": "prontuario-clinical-release-smoke/2.1",
    },
    body: JSON.stringify({ provider: "google", callbackURL: "/", errorCallbackURL: "/auth/error" }),
  });

  const body = await response.json().catch(() => null) as { redirect?: boolean; url?: string } | null;
  const check = validateGoogleOAuthBootstrap({ status: response.status, redirect: body?.redirect, url: body?.url, setCookies: responseCookies(response) });
  if (!check.ok) blocked(check.reason);
}

async function startGoogleOAuthViaPublicEntrypoint(base: URL) {
  const response = await request(base, "/auth/google", "manual");
  if (response.status !== 303) blocked(`/auth/google respondeu HTTP ${response.status}; o fluxo padrão não iniciou redirecionamento direto para o Google.`);
  const cacheControl = response.headers.get("cache-control")?.toLowerCase() ?? "";
  if (!cacheControl.includes("no-store")) blocked("/auth/google não confirmou Cache-Control: no-store.");
  if (responseCookies(response).length === 0) blocked("/auth/google não encaminhou Set-Cookie do state/PKCE.");
  const location = response.headers.get("location") ?? "";
  let googleTarget: URL;
  try {
    googleTarget = new URL(location);
  } catch {
    blocked("/auth/google não retornou Location OAuth válida.");
  }
  if (googleTarget.protocol !== "https:" || googleTarget.hostname !== "accounts.google.com" || !googleTarget.searchParams.get("state")) {
    blocked("/auth/google não redirecionou diretamente para Google HTTPS com state.");
  }

  const manual = await request(base, "/auth/google?manual=1", "manual");
  if (manual.status !== 200) blocked(`/auth/google?manual=1 respondeu HTTP ${manual.status}; o modo compatível está indisponível.`);
  const manualCacheControl = manual.headers.get("cache-control")?.toLowerCase() ?? "";
  if (!manualCacheControl.includes("no-store")) blocked("/auth/google?manual=1 não confirmou Cache-Control: no-store.");
  if (responseCookies(manual).length === 0) blocked("/auth/google?manual=1 não encaminhou Set-Cookie do state/PKCE.");
  const html = await manual.text();
  if (!html.includes('data-google-oauth-continuation="true"')) blocked("Modo compatível não apresentou continuação navegável para o Google.");
  if (!html.includes('data-google-oauth-user-gesture="true"') || !html.includes('target="_top"')) blocked("Modo compatível não preservou gesto explícito do usuário.");
  if (!html.includes('data-google-oauth-browser-restart="true"') || !html.includes('target="_blank"')) blocked("Modo compatível não oferece abertura do Google em nova janela.");
  if (html.toLowerCase().includes('http-equiv="refresh"') || /window\.location|location\.replace|location\.assign/i.test(html)) blocked("Modo compatível contém redirecionamento automático inesperado.");
  if (!html.includes("https://accounts.google.com/") || !html.includes("state=")) blocked("Modo compatível não contém destino Google HTTPS com state.");
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
    oncogeriatria?: { enabled?: boolean; schemaReady?: boolean; version?: string };
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
  if (
    healthBody.oncogeriatria?.enabled !== true ||
    healthBody.oncogeriatria.schemaReady !== true ||
    healthBody.oncogeriatria.version !== ONCOGERIATRIA_VERSION
  ) {
    blocked("/api/health não confirmou Oncogeriatria ativa, schema pronto e versão esperada.");
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
  if (!loginHtml.includes("Continuar com Google")) blocked("/login não contém a ação de autenticação Google.");
  if (!loginHtml.includes('href="/auth/google"')) {
    await logLoginDeliveryMismatch(base, login, loginHtml);
    blocked("/login não contém o link navegável vigente para autenticação Google.");
  }
  if (!loginHtml.includes("Usar modo compatível") || !loginHtml.includes('href="/auth/google?manual=1"')) blocked("/login não oferece fallback explícito para navegadores internos.");

  await startGoogleOAuth(base);
  await startGoogleOAuthViaPublicEntrypoint(base);

  for (const path of ["/patients", "/patients/new", "/programa-55", "/oncogeriatria"]) {
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
console.log(`- Oncogeriatria confirmada ativa, schema pronto e versão ${ONCOGERIATRIA_VERSION}`);
console.log("- /api/health/auth confirmou prontidão estática do OAuth");
console.log("- CSS e JavaScript do Next.js presentes e entregues com HTTP 200");
console.log("- /login contém o link navegável e a interface de acesso vigentes");
console.log("- endpoint canônico do Better Auth iniciou Google OAuth com state e Set-Cookie");
console.log("- /auth/google redireciona diretamente para o Google e preserva state/PKCE");
console.log("- /auth/google?manual=1 mantém fallback por gesto explícito para navegadores internos");
console.log("- rotas clínicas, incluindo /programa-55 e /oncogeriatria, não estão abertas anonimamente");
