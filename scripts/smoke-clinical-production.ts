import { CLINICAL_RELEASE_ID } from "../src/domain/clinical-release.ts";

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
    headers: { "user-agent": "prontuario-clinical-release-smoke/1.1" },
  });
}

function assertGoogleOAuthRedirect(response: Response) {
  if (![302, 303, 307, 308].includes(response.status)) {
    blocked(`/auth/google não iniciou redirecionamento OAuth: HTTP ${response.status}.`);
  }

  const location = response.headers.get("location");
  if (!location) blocked("/auth/google respondeu sem cabeçalho Location.");

  let target: URL;
  try { target = new URL(location); } catch { blocked("/auth/google retornou Location inválido."); }
  if (target.protocol !== "https:" || target.hostname !== "accounts.google.com") {
    blocked(`/auth/google não redirecionou para o Google OAuth (${target.origin}).`);
  }
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

  const login = await request(base, "/login", "follow");
  if (login.status !== 200) blocked(`/login respondeu HTTP ${login.status}.`);
  const loginHtml = await login.text();
  if (!loginHtml.includes('href="/auth/google"')) {
    blocked("/login não contém o fallback server-side para iniciar autenticação Google.");
  }

  const oauthStart = await request(base, "/auth/google", "manual");
  assertGoogleOAuthRedirect(oauthStart);

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
console.log("- CSS e JavaScript do Next.js presentes e entregues com HTTP 200");
console.log("- /login contém fallback server-side de autenticação");
console.log("- /auth/google iniciou Google OAuth");
console.log("- rotas clínicas não estão abertas anonimamente");
