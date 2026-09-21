import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) { return readFile(path, "utf8"); }

test("CARG consulta-cêntrico possui rota estável, contexto explícito e orçamento de leitura", async () => {
  const [route, entry, read, navigation, links] = await Promise.all([
    source("src/app/patients/[id]/oncogeriatria/carg/page.tsx"),
    source("src/components/oncogeriatria/carg-entry.tsx"),
    source("src/server/oncogeriatria/read.ts"),
    source("src/components/oncogeriatria/oncogeriatric-nav.tsx"),
    source("src/domain/oncogeriatria/return-navigation.ts"),
  ]);
  assert.match(route, /searchParams: Promise<\{ episode\?: string; checkpoint\?: string; consultation\?: string \}>/);
  assert.match(route, /loadOncogeriatricCargWorkspace/);
  assert.match(route, /CargCheckpointStartForm/);
  assert.match(entry, /router\.replace/);
  assert.match(read, /where: \{ id: requestedCheckpointId, patientId, episodeId \}/);
  assert.match(read, /where: \{ patientId, episodeId, consultationId: requestedConsultationId \}/);
  assert.match(read, /ONCOGERIATRIC_CARG_QUERY_BUDGET = 6/);
  assert.match(navigation, /path: "\/carg"/);
  assert.match(links, /\/oncogeriatria\/carg/);
  assert.doesNotMatch(route, /redirect\([^)]*basal/);
});

test("a entrada durante o tratamento abre CARG no checkpoint recém-criado", async () => {
  const [checkForm, checkPage, startForm] = await Promise.all([
    source("src/components/oncogeriatria/domain-linked-check-form.tsx"),
    source("src/app/patients/[id]/oncogeriatria/check/page.tsx"),
    source("src/components/oncogeriatria/carg-entry.tsx"),
  ]);
  assert.match(checkForm, /action:"CHECKPOINT_CREATE"/);
  assert.match(checkForm, /router\.replace\(buildOncogeriatricCargHref/);
  assert.match(checkPage, /Primeira escala do momento clínico/);
  assert.match(checkPage, /não avaliado nesta consulta/);
  assert.match(startForm, /Iniciar momento e abrir CARG/);
});

test("persistência continua isolada por paciente, episódio, checkpoint e consulta", async () => {
  const service = await source("src/server/oncogeriatria/service.ts");
  assert.match(service, /where: \{ id: checkpointId, episodeId, patientId \}/);
  assert.match(service, /checkpoint\.cargAssessmentId/);
  assert.match(service, /patientId, consultationId: checkpoint\.consultationId/);
  assert.match(service, /data: \{ cargAssessmentId: saved\.id/);
  assert.match(service, /cargCompletionCount: 11/);
  assert.doesNotMatch(service, /type === "PRE_TREATMENT"[\s\S]{0,160}saveCarg/);
});

test("links internos não dependem mais de hash inexistente em basal", async () => {
  const files = await Promise.all([
    source("src/app/oncogeriatria/page.tsx"),
    source("src/app/patients/[id]/page.tsx"),
    source("src/app/patients/[id]/oncogeriatria/page.tsx"),
    source("src/components/oncogeriatria/oncogeriatric-nav.tsx"),
  ]);
  const joined = files.join("\n");
  assert.match(joined, /buildOncogeriatricCargHref/);
  assert.doesNotMatch(joined, /\/basal\?episode=.*#carg/);
});

test("visão geral representa o CARG do checkpoint mais recente sem reutilizar resultado anterior", async () => {
  const overview = await source("src/app/patients/[id]/oncogeriatria/page.tsx");
  assert.match(overview, /cargInLatestCheckpoint/);
  assert.match(overview, /Não avaliado nesta consulta/);
  assert.match(overview, /latestCheckpoint\?\.cargSavedAt/);
  assert.match(overview, /Ver trajetória/);
});
