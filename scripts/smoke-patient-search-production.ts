export {};

const REQUEST_TIMEOUT_MS = 15_000;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} não configurada.`);
  return value;
}

function baseUrl(): URL {
  const url = new URL(required("APP_URL"));
  if (url.protocol !== "https:") throw new Error("APP_URL precisa usar HTTPS.");
  url.pathname = "/";
  url.search = "";
  url.hash = "";
  return url;
}

async function patientSearch(base: URL, cookie: string, query: string) {
  const response = await fetch(new URL("/api/patients/search", base), {
    method: "POST",
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      "cache-control": "no-cache",
      "content-type": "application/json",
      cookie,
      "user-agent": "prontuario-patient-search-smoke/1.0",
    },
    body: JSON.stringify({ query }),
  });
  const payload = await response.json().catch(() => null) as {
    results?: Array<{
      id?: string;
      destinationPath?: string;
      [key: string]: unknown;
    }>;
    code?: string;
  } | null;
  return { response, payload };
}

const base = baseUrl();
const cookie = required("PATIENT_SEARCH_SMOKE_COOKIE");
const query = required("PATIENT_SEARCH_SMOKE_QUERY");
const expectedPatientId = required("PATIENT_SEARCH_SMOKE_EXPECT_PATIENT_ID");

try {
  const { response, payload } = await patientSearch(base, cookie, query);
  if (response.status !== 200) {
    throw new Error(`busca autenticada respondeu HTTP ${response.status}`);
  }
  const cacheControl = response.headers.get("cache-control")?.toLowerCase() ?? "";
  for (const directive of ["private", "no-store", "max-age=0"]) {
    if (!cacheControl.includes(directive)) {
      throw new Error(`Cache-Control não contém ${directive}`);
    }
  }

  const result = payload?.results?.find((item) => item.id === expectedPatientId);
  if (!result) throw new Error("paciente sintético esperado não foi localizado");
  if (!/^\/(patients|consultations)\//.test(result.destinationPath ?? "")) {
    throw new Error("destinationPath do paciente sintético é inválido");
  }
  const serialized = JSON.stringify(result);
  if (/phone|caregiverPhone|cpf|cns|identifier/i.test(serialized)) {
    throw new Error("resposta expôs campo identificável além do contrato mínimo");
  }

  const noMatch = await patientSearch(base, cookie, "Mariana");
  if (noMatch.response.status !== 200) {
    throw new Error(`controle negativo respondeu HTTP ${noMatch.response.status}`);
  }
  if (noMatch.payload?.results?.some((item) => item.id === expectedPatientId)) {
    throw new Error("controle negativo produziu falso positivo para o paciente sintético");
  }

  const invalid = await patientSearch(base, cookie, "a");
  if (invalid.response.status !== 400 || invalid.payload?.code !== "INVALID_PATIENT_SEARCH") {
    throw new Error("busca inválida não retornou 400/INVALID_PATIENT_SEARCH");
  }

  const anonymous = await fetch(new URL("/api/patients/search", base), {
    method: "POST",
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    headers: {
      "content-type": "application/json",
      "user-agent": "prontuario-patient-search-smoke/1.0",
    },
    body: JSON.stringify({ query: "Paciente Sintético" }),
  });
  if (anonymous.status !== 401) {
    throw new Error(`busca sem sessão deveria retornar 401, recebeu HTTP ${anonymous.status}`);
  }
} catch (error) {
  console.error("PATIENT_SEARCH_PRODUCTION_SMOKE=BLOCKED");
  console.error(`- ${error instanceof Error ? error.message : "falha desconhecida"}`);
  console.error("- nenhum nome de paciente, termo pesquisado ou cookie foi exibido");
  process.exit(1);
}

console.log("PATIENT_SEARCH_PRODUCTION_SMOKE=OK");
console.log("- busca autenticada localizou o paciente sintético esperado");
console.log("- destinationPath clínico validado");
console.log("- Cache-Control private/no-store/max-age=0 confirmado");
console.log("- controle negativo não produziu falso positivo");
console.log("- erro 400 e sessão 401 diferenciados");
console.log("- nenhum nome de paciente, termo pesquisado ou cookie foi exibido");
