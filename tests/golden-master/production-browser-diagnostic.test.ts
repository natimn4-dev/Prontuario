import assert from "node:assert/strict";
import test from "node:test";
import { resolve4, resolve6, resolveCname } from "node:dns/promises";
import { spawnSync } from "node:child_process";
import { networkInterfaces } from "node:os";

const host = "prontuario.nataliamendesgeriatra.com";
const loginUrl = `https://${host}/login`;

function command(bin: string, args: string[], timeout = 20_000) {
  const result = spawnSync(bin, args, { encoding: "utf8", timeout });
  return {
    status: result.status,
    signal: result.signal,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    error: result.error?.message,
  };
}

function chromeBinary(): string | null {
  for (const candidate of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]) {
    const found = command("bash", ["-lc", `command -v ${candidate} || true`]).stdout.trim();
    if (found) return found;
  }
  return null;
}

function runnerHasGlobalIpv6(): boolean {
  return Object.values(networkInterfaces()).some((addresses) => addresses?.some((item) => {
    if (item.family !== "IPv6" || item.internal) return false;
    const address = item.address.toLowerCase();
    return !address.startsWith("fe80:") && !address.startsWith("fc") && !address.startsWith("fd");
  }));
}

async function dnsSnapshot() {
  const cname = await resolveCname(host).catch((error) => [`ERROR:${error instanceof Error ? error.message : String(error)}`]);
  const a = await resolve4(host, { ttl: true }).catch((error) => {
    console.log("PROD_DIAG_DNS_A_ERROR", error instanceof Error ? error.message : String(error));
    return [];
  });
  const aaaa = await resolve6(host, { ttl: true }).catch((error) => {
    console.log("PROD_DIAG_DNS_AAAA_ERROR", error instanceof Error ? error.message : String(error));
    return [];
  });
  console.log("PROD_DIAG_DNS_CNAME", JSON.stringify(cname));
  console.log("PROD_DIAG_DNS_A", JSON.stringify(a));
  console.log("PROD_DIAG_DNS_AAAA", JSON.stringify(aaaa));
  return { a, aaaa };
}

function pinnedCurl(address: string, family: 4 | 6) {
  const resolveValue = family === 6 ? `${host}:443:[${address}]` : `${host}:443:${address}`;
  const result = command("curl", [
    family === 6 ? "-6" : "-4",
    "-sS",
    "--connect-timeout", "5",
    "--max-time", "12",
    "--resolve", resolveValue,
    "-w", "\n__META__ http=%{http_code} remote=%{remote_ip} verify=%{ssl_verify_result} connect=%{time_connect} tls=%{time_appconnect} total=%{time_total}",
    loginUrl,
  ], 15_000);
  const healthy = result.status === 0 && /Entrar com Google/.test(result.stdout);
  console.log(`PROD_DIAG_PINNED_IPV${family}_${address}`, JSON.stringify({
    ...result,
    stdout: result.stdout.slice(0, 3000),
    stderr: result.stderr.slice(-3000),
    healthy,
  }));
  return healthy;
}

test("diagnóstico de produção identifica cada endpoint DNS e valida /login em Chrome real", async () => {
  const { a, aaaa } = await dnsSnapshot();
  assert.ok(a.length + aaaa.length > 0, "DNS de produção não publicou endpoints.");

  const endpointResults: Array<{ family: 4 | 6; address: string; healthy: boolean }> = [];
  for (const record of a) endpointResults.push({ family: 4, address: record.address, healthy: pinnedCurl(record.address, 4) });
  const ipv6Capable = runnerHasGlobalIpv6();
  console.log("PROD_DIAG_IPV6_RUNNER_CAPABILITY", JSON.stringify({ ipv6Capable }));
  if (ipv6Capable) {
    for (const record of aaaa) endpointResults.push({ family: 6, address: record.address, healthy: pinnedCurl(record.address, 6) });
  } else if (aaaa.length) {
    console.log("PROD_DIAG_IPV6_SKIPPED", "O executor não possui endereço IPv6 global; os registros AAAA permanecem visíveis no snapshot DNS.");
  }
  console.log("PROD_DIAG_ENDPOINT_SUMMARY", JSON.stringify(endpointResults));

  const defaultCurl = command("curl", [
    "-sS", "--connect-timeout", "5", "--max-time", "12",
    "-w", "\n__META__ http=%{http_code} remote=%{remote_ip} verify=%{ssl_verify_result} total=%{time_total}",
    loginUrl,
  ], 15_000);
  console.log("PROD_DIAG_CURL_DEFAULT", JSON.stringify({ ...defaultCurl, stdout: defaultCurl.stdout.slice(0, 3000) }));
  assert.equal(defaultCurl.status, 0, "A rota padrão não conseguiu acessar /login.");
  assert.match(defaultCurl.stdout, /Entrar com Google/, "A rota padrão não recebeu a página real de login.");

  const chrome = chromeBinary();
  if (chrome) {
    const browserEndpoint = endpointResults.find((item) => item.healthy && item.family === 4);
    assert.ok(browserEndpoint, "Nenhum endpoint IPv4 saudável ficou disponível para a verificação do navegador.");
    const result = command(chrome, [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--disable-quic",
      "--disable-background-networking",
      "--disable-component-update",
      "--disable-default-apps",
      "--no-first-run",
      "--no-default-browser-check",
      "--host-resolver-rules", `MAP ${host} ${browserEndpoint.address}`,
      "--virtual-time-budget=5000",
      "--dump-dom",
      loginUrl,
    ], 30_000);
    console.log("PROD_DIAG_CHROME_STATUS", result.status, result.signal, result.error ?? "");
    console.log("PROD_DIAG_CHROME_STDERR", result.stderr.slice(-4000));
    console.log("PROD_DIAG_CHROME_DOM", result.stdout.slice(0, 6000));
    assert.equal(result.status, 0, "O Chrome real não conseguiu abrir /login.");
    const receivedLogin = /Entrar com Google/.test(result.stdout);
    const receivedHostingerChallenge = /Checking your browser before accessing/.test(result.stdout)
      && /hcdn-cgi\/jschallenge/.test(result.stdout);
    console.log("PROD_DIAG_CHROME_DELIVERY", JSON.stringify({ receivedLogin, receivedHostingerChallenge }));
    assert.ok(
      receivedLogin || receivedHostingerChallenge,
      "O Chrome real não recebeu a página de login nem o desafio de segurança reconhecido da Hostinger.",
    );
  }

  assert.ok(endpointResults.length > 0, "Nenhum endpoint pôde ser testado a partir deste executor.");
  assert.ok(endpointResults.some((item) => item.healthy), "Nenhum endpoint DNS publicado conseguiu servir a página real de login.");
  assert.ok(endpointResults.every((item) => item.healthy), "Há endpoint DNS publicado sem conseguir servir /login; a produção está inconsistente entre rotas/IPs.");
});
