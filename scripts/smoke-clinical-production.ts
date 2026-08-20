import { CLINICAL_RELEASE_ID } from "../src/domain/clinical-release.ts";
import { validateGoogleOAuthBootstrap } from "../src/domain/oauth-bootstrap-smoke.ts";

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
    headers: { "user-agent": "prontuario-clinical-release-smoke/1.3" },
  });
}

async function startGoogleOAuth(base: URL) {
  const url = new URL("/api/auth/sign-in/social", base);
  const response = await fetch(url, {
    method: "POST",
    redirect: "manual",
    headers: {
      "content-type": "application/json",
      "user-agent": "prontuario-clinical-release-smoke/1.3",
    },
    body: JSON.stringify({
      provider: "google",
      callbackURL: "/",
      errorCallbackURL: "/login?error=google",
    }),
  });

  const body = await response.json().catch(() => null) as {
    redirect?: boolean;
    url?: string;
  } | null;

  const setCookies = typeof response.headers.getSetCookie === "function"
    ? response.headers.getSetCookie()
    : response.headers.get("set-cookie")
      ? [response.headers.get("set-cookie") as string]
      : [];

  const check = validateGoogleOAuthBootstrap({
    status: response.status,
    redirect: body?.redirect,
    url: body?.url,
    setCookies,
  });

  if (!check.ok) blocked(check.reason);
}

const base = productionBaseUrl();

try {
  const health = await request(base, "/api/health", "follow");
  if (health.status !== 200) blocked(`/api/health respondeu HTTP ${health.status}.`);
  const healthBody = await health.json().catch(() => null) as { status?: string; database?: string; releaseId?: string } | null;
  if (healthBody?.status !== "ok" || healthBody.database !== "ok") blocked("/api/health não confirmou aplicação e banco em estado ok.");
  if (healthBody.releaseId !== CLINICAL_RELEASE_ID) {
    blocked(`/api/health está saudável, mas executa release diferente da esperada (${healthBody.releaseId ?? "sem releaseId"}).`);
  }

  const assets = await request(base, "/api/health/assets", "follow");
  if (assets.status !== 200) blocked(`/api/health/assets respondeu HTTP ${assets.status}.`);
  const assetsBody = await assets.json().catch(() => null) as {
    status?: string;
    localAssets?: { cssPresent?: boolean; jsPresent?: boolean };
    publicDelivery?: { cssStatus?: number | null; jsStatus?: number | null };
  } | null;
  if (assetsBody?.status !== "ok") blocked("/api/health/assets não confirmou estado ok.");
  if (assetsBody.localAssets?.cssPresent !== true || assetsBody.localAssets?.jsPresent !== true) {
    blocked("Build publicado não contém CSS e JavaScript do Next.js.");
  }
  if (assetsBody.publicDelivery?.cssStatus !== 200 || assetsBody.publicDelivery?.jsStatus !== 200) {
    blocked(`Hostinger não está entregando assets estáticos corretamente (CSS ${assetsBody.publicDelivery?.cssStatus ?? "sem status"}; JS ${assetsBody.publicDelivery?.jsStatus ?? "sem status"}).`);
  }

  const authHealth = await request(base, "/api/health/auth", "follow");
  if (authHealth.status !== 200) blocked(`/api/health/auth respondeu HTTP ${authHealth.status}.`);
  const authHealthBody = await authHealth.json().catch(() => null) as { status?: string } | null;
  if (authHealthBody?.status !== "ready") blocked("/api/health/auth não confirmou prontidão estática do OAuth.");

  const login = await request(base, "/login", "follow");
  if (login.status !== 200) blocked(`/login respondeu HTTP ${login.status}.`);
  const loginHtml = await login.text();
  if (!loginHtml.includes("Entrar com Google")) {
    blocked("/login não contém a ação de autenticação Google.");
  }

  await startGoogleOAuth(base);

  for (const path of ["/patients", "/patients/new"]) {
    const protectedResponse = await request(base, path, "manual");
    if (protectedResponse.status === 200) blocked(`${path} ficou acessível anonimamente.`);
    if (![301, 302, 303, 307, 308, 401, 403].includes(protectedResponse.status)) {
      blocked(`${path} apresentou comportamento inesperado para acesso anônimo: HTTP ${protectedResponse.status}.`);
    }
  }
} catch (error) {
  if (error instanceof Error && error.message.includes("CLINICAL_RELEASE")) throw error;
  blocked("Falha de rede/DNS/TLS durante o smoke test do domínio de produção.");
}

console.log("CLINICAL_RELEASE=SMOKE_OK");
console.log(`- HTTPS acessível: ${base.origin}`);
console.log(`- release confirmada: ${CLINICAL_RELEASE_ID}`);
console.log("- /api/health confirmou banco ok");
console.log("- /api/health/auth confirmou prontidão estática do OAuth");
console.log("- CSS e JavaScript do Next.js presentes e entregues com HTTP 200");
console.log("- /login contém ação de autenticação Google");
console.log("- endpoint canônico do Better Auth iniciou Google OAuth com state e Set-Cookie");
console.log("- rotas clínicas não estão abertas anonimamente");
