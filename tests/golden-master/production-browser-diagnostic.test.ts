import assert from "node:assert/strict";
import test from "node:test";
import { resolve4, resolve6 } from "node:dns/promises";
import { spawnSync } from "node:child_process";

const host = "prontuario.nataliamendesgeriatra.com";
const loginUrl = `https://${host}/login`;
const rootUrl = `https://${host}/`;

function command(bin: string, args: string[]) {
  const result = spawnSync(bin, args, { encoding: "utf8", timeout: 30_000 });
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

test("diagnóstico de produção: DNS, IPv4/IPv6 e Chrome real conseguem carregar /login", async (t) => {
  const a = await resolve4(host).catch((error) => [`ERROR:${error instanceof Error ? error.message : String(error)}`]);
  const aaaa = await resolve6(host).catch((error) => [`ERROR:${error instanceof Error ? error.message : String(error)}`]);
  console.log("PROD_DIAG_DNS_A", JSON.stringify(a));
  console.log("PROD_DIAG_DNS_AAAA", JSON.stringify(aaaa));

  for (const family of ["-4", "-6"]) {
    const curl = command("curl", [family, "-sS", "-L", "--max-time", "15", "-o", "/dev/null", "-w", "%{http_code} %{remote_ip} %{http_version} %{time_total}", loginUrl]);
    console.log(`PROD_DIAG_CURL_${family === "-4" ? "IPV4" : "IPV6"}`, JSON.stringify(curl));
  }

  const chrome = chromeBinary();
  if (!chrome) {
    t.skip("Chrome/Chromium não disponível no runner; DNS/curl registrados.");
    return;
  }
  console.log("PROD_DIAG_CHROME", chrome);

  for (const [label, url, extra] of [
    ["LOGIN_DEFAULT", loginUrl, []],
    ["ROOT_DEFAULT", rootUrl, []],
    ["LOGIN_NO_QUIC", loginUrl, ["--disable-quic"]],
  ] as const) {
    const result = command(chrome, [
      "--headless=new",
      "--no-sandbox",
      "--disable-gpu",
      "--disable-dev-shm-usage",
      "--virtual-time-budget=5000",
      ...extra,
      "--dump-dom",
      url,
    ]);
    console.log(`PROD_DIAG_CHROME_${label}_STATUS`, result.status, result.signal, result.error ?? "");
    console.log(`PROD_DIAG_CHROME_${label}_STDERR`, result.stderr.slice(-6000));
    console.log(`PROD_DIAG_CHROME_${label}_DOM`, result.stdout.slice(0, 12000));
    if (label === "LOGIN_DEFAULT") {
      assert.equal(result.status, 0, `Chrome falhou ao abrir /login: ${result.stderr.slice(-2000)}`);
      assert.match(result.stdout, /Entrar com Google/, "Chrome não renderizou a página real de login.");
      assert.doesNotMatch(result.stdout, /This page couldn.?t load/i, "Chrome caiu no error boundary do Next.js em /login.");
    }
  }
});
