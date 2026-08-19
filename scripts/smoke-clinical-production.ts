export {};

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
  return fetch(url, { method: "GET", redirect, headers: { "user-agent": "prontuario-clinical-release-smoke/1.0" } });
}

const base = productionBaseUrl();

try {
  const health = await request(base, "/api/health", "follow");
  if (health.status !== 200) blocked(`/api/health respondeu HTTP ${health.status}.`);
  const healthBody = await health.json().catch(() => null) as { status?: string; database?: string } | null;
  if (healthBody?.status !== "ok" || healthBody.database !== "ok") blocked("/api/health não confirmou aplicação e banco em estado ok.");

  const login = await request(base, "/login", "follow");
  if (login.status !== 200) blocked(`/login respondeu HTTP ${login.status}.`);

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
console.log("- /api/health confirmou banco ok");
console.log("- /login acessível");
console.log("- rotas clínicas não estão abertas anonimamente");
