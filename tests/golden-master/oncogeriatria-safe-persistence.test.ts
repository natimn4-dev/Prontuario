import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function source(path: string) { return readFile(path, "utf8"); }

test("criações oncogeriátricas persistem dado, auditoria e recibo de idempotência dentro de transações", async () => {
  const service = await source("src/server/oncogeriatria/service.ts");
  for (const entity of ["oncogeriatricEpisode", "oncogeriatricTreatmentCourse", "oncogeriatricCheckpoint", "oncogeriatricIntervention", "oncogeriatricToxicityEvent", "oncogeriatricRecoveryAssessment", "oncogeriatricReportSnapshot"]) {
    assert.match(service, new RegExp(`tx\\.${entity}\\.create`));
  }
  assert.doesNotMatch(service, /async function audit\(/);
  assert.match(service, /tx\.auditEvent\.create/g);
  assert.match(service, /tx\.oncogeriatricOperationReceipt\.create/g);
  assert.match(service, /requestId: opId/g);
});

test("idempotência tem chave única por paciente e operação e resposta explícita para replay", async () => {
  const [schema, migration, service] = await Promise.all([
    source("prisma/schema.prisma"),
    source("prisma/migrations/20260920223000_oncogeriatria_safe_persistence/migration.sql"),
    source("src/server/oncogeriatria/service.ts"),
  ]);
  assert.match(schema, /@@unique\(\[patientId, operationId\]\)/);
  assert.match(migration, /UNIQUE INDEX `OncoOperationReceipt_patient_operation_key`\(`patientId`, `operationId`\)/);
  assert.match(service, /saveStatus: "already_saved"/);
  assert.match(service, /O registro já havia sido salvo/);
  assert.match(service, /Registro confirmado/);
  assert.match(service, /IDEMPOTENCY_KEY_REUSED/);
});

test("checkpoint usa concorrência otimista e conflito 409 sem merge clínico automático", async () => {
  const [schema, service, editor] = await Promise.all([source("prisma/schema.prisma"), source("src/server/oncogeriatria/service.ts"), source("src/components/oncogeriatria/checkpoint-revision-editor.tsx")]);
  assert.match(schema, /revision\s+Int\s+@default\(1\)/);
  assert.match(service, /expectedRevision/);
  assert.match(service, /updateMany\([\s\S]*where: \{ id: checkpointId, patientId, episodeId, revision \}/);
  assert.match(service, /revision: \{ increment: 1 \}/);
  assert.match(service, /CHECKPOINT_REVISION_CONFLICT/);
  assert.match(service, /409/);
  assert.match(service, /Recarregue e revise as mudanças antes de substituir qualquer conteúdo clínico/);
  assert.doesNotMatch(service, /mergeStructuredData|deepMerge|autoMerge/i);
  assert.match(editor, /expectedRevision: revision/);
  assert.match(editor, /CHECKPOINT_REVISION_CONFLICT/);
  assert.match(editor, /Seu texto foi preservado nesta tela/);
  assert.match(editor, /Recarregar versão mais recente antes de substituir/);
  assert.doesNotMatch(editor, /reset\(\)/);
});

test("snapshot exige revisão clínica no servidor, registra autor/data e serializa versão por episódio", async () => {
  const [schema, service, actions] = await Promise.all([
    source("prisma/schema.prisma"),
    source("src/server/oncogeriatria/service.ts"),
    source("src/components/oncogeriatria/report-actions.tsx"),
  ]);
  const snapshotService = service.slice(service.indexOf("export async function createOncogeriatricReportSnapshot"));
  const checkpointService = service.slice(service.indexOf("export async function createOncogeriatricCheckpoint"), service.indexOf("export async function updateOncogeriatricCheckpoint"));
  assert.match(service, /input\.clinicalReviewConfirmed !== true/);
  assert.match(service, /CLINICAL_REVIEW_REQUIRED/);
  assert.match(schema, /clinicalReviewConfirmedById String\?/);
  assert.match(schema, /clinicalReviewConfirmedAt DateTime\?/);
  assert.match(service, /clinicalReviewConfirmedById: user\.id/);
  assert.match(service, /clinicalReviewConfirmedAt: reviewAt/);
  assert.match(service, /FOR UPDATE/);
  assert.match(service, /isolationLevel: "Serializable"/);
  assert.match(schema, /@@unique\(\[episodeId, version\]\)/);
  assert.match(actions, /shareConfirmed/);
  assert.match(actions, /disabled=\{!shareConfirmed/);
  assert.match(actions, /data-onco-clinical-review/);
  assert.match(snapshotService, /requiredText\(input\.consultationId, "Consulta vinculada ao relatório"/);
  assert.match(snapshotService, /REPORT_CONSULTATION_MISMATCH/);
  assert.match(snapshotService, /where: \{ patientId, episodeId, consultationId \}/);
  assert.match(checkpointService, /const consultationId = safeText\(input\.consultationId, 191\)/);
  assert.match(actions, /const canArchive = Boolean\(consultationId\)/);
  assert.match(actions, /disabled=\{!canArchive \|\| pending \|\| shareConfirmed\}/);
  assert.match(actions, /Vincule este acompanhamento a uma consulta/);
  const report = await source("src/app/patients/[id]/oncogeriatria/relatorio/page.tsx");
  const form = await source("src/components/oncogeriatria/oncogeriatric-forms.tsx");
  assert.match(form, /commonAdverseEffects:text\(form,"commonAdverseEffects"\)/);
  assert.match(form, /commonAdverseEffectsSource:text\(form,"commonAdverseEffectsSource"\)/);
  assert.match(report, /commonAdverseEffects: commonAdverseEffects \|\| null/);
  assert.match(report, /commonAdverseEffectsSource: commonAdverseEffectsSource \|\| null/);
  assert.match(report, /schemaVersion: "oncogeriatria-report-v7"/);
  assert.match(report, /Efeitos adversos frequentes esperados, confirmados para este esquema/);
  assert.match(report, /Fonte clínica registrada:/);
  assert.match(report, /Não registrados para este esquema\. O sistema não os infere/);
});

test("vínculo tardio da consulta usa revisão otimista e não religa avaliação já vinculada", async () => {
  const [service, route, linker] = await Promise.all([
    source("src/server/oncogeriatria/service.ts"),
    source("src/app/api/oncogeriatria/patients/[id]/route.ts"),
    source("src/components/oncogeriatria/checkpoint-consultation-linker.tsx"),
  ]);
  assert.match(service, /linkOncogeriatricCheckpointConsultation/);
  assert.match(service, /CHECKPOINT_CONSULTATION_ALREADY_LINKED/);
  assert.match(service, /where: \{ id: checkpointId, patientId, episodeId, revision, consultationId: null \}/);
  assert.match(service, /revision: \{ increment: 1 \}/);
  assert.match(service, /oncogeriatria\.checkpoint\.link-consultation/);
  assert.match(route, /CHECKPOINT_LINK_CONSULTATION/);
  assert.match(linker, /expectedRevision/);
  assert.match(linker, /window\.location\.assign/);
  assert.match(linker, /#carg/);
});

test("CARG mantém cálculo no servidor, rascunho/proveniência e revisão de diferenças antes de substituir avaliação arquivada", async () => {
  const [service, form, audit] = await Promise.all([
    source("src/server/oncogeriatria/service.ts"),
    source("src/components/oncogeriatria/checklist-scales.tsx"),
    source("src/domain/oncogeriatria/carg-audit.ts"),
  ]);
  assert.match(service, /calculateCarg\(answers\)/);
  assert.match(service, /summarizeCargCompleteness\(answers\)/);
  assert.match(service, /CARG_INCOMPLETE/);
  assert.match(service, /cargLabProvenance/);
  assert.match(service, /CARG_ARCHIVED_DIFFERENCE_REVIEW_REQUIRED/);
  assert.match(service, /confirmArchivedDifference/);
  assert.match(service, /shouldCreateNewAssessment/);
  assert.match(form, /Salvar rascunho/);
  assert.match(form, /salvo em/i);
  assert.match(form, /Confirmar nova avaliação após revisão/);
  assert.match(audit, /CARG_TREATMENT_COURSE_COMPLETION_POLICY = "PRESERVE_CURRENT"/);
});

test("CARG confirma persistência no servidor e revalida a página após salvar", async () => {
  const [service, form] = await Promise.all([
    source("src/server/oncogeriatria/service.ts"),
    source("src/components/oncogeriatria/checklist-scales.tsx"),
  ]);
  assert.match(service, /CARG_PERSISTENCE_CONFIRMATION_FAILED/);
  assert.match(service, /persisted: true/);
  assert.match(form, /result\?\.persisted !== true/);
  assert.match(form, /router\.refresh\(\)/);
  assert.match(form, /Você pode sair e retomar depois/);
  assert.match(form, /permanecerá disponível ao reabrir a avaliação/);
});

test("pontos de inflexão usam associação temporal sem atribuir causalidade", async () => {
  const chart = await source("src/components/reports/capacity-dimension-history-chart.tsx");
  assert.match(chart, /Registro temporal associado/);
  assert.match(chart, /data-inflection="true"/);
  assert.match(chart, /↳ \{inflection\.shortLabel\}/);
  assert.match(chart, /Sem motivo associado registrado nesta consulta/);
  assert.match(chart, /não atribui causalidade/);
  assert.match(chart, /não reaplicada na mais recente/);
  assert.match(chart, /mesmo instrumento e versão/);
});

test("relatório mostra tabela cronológica completa sem reduzir trajetória a três momentos", async () => {
  const continuity = await source("src/components/oncogeriatria/clinical-continuity.tsx");
  assert.match(continuity, /Histórico cronológico completo por domínio e consulta vinculada ao episódio oncológico/);
  assert.match(continuity, /history\.consultations\.map/);
  assert.match(continuity, /Não avaliada nesta consulta/);
  assert.match(continuity, /Sem série comparável para este ponto/);
  assert.doesNotMatch(continuity, /<th scope="col">Avaliação anterior<\/th>/);
});

test("longitudinal não limita séries arbitrariamente e mantém CARG em cartão próprio por versão", async () => {
  const [page, priority] = await Promise.all([
    source("src/app/patients/[id]/oncogeriatria/longitudinal/page.tsx"),
    source("src/domain/oncogeriatria/chart-priority.ts"),
  ]);
  assert.doesNotMatch(page, /\.slice\(0\s*,\s*8\)/);
  assert.match(page, /CARG longitudinal/);
  assert.match(page, /cargRowsByVersion/);
  assert.match(page, /cargTimelineRows/);
  assert.match(page, /Não avaliado nesta consulta/);
  assert.match(page, /Exibir escalas adicionais/);
  assert.match(priority, /CARG: 0/);
  assert.match(priority, /G8: 10/);
  assert.match(priority, /ECOG: 20/);
  assert.match(priority, /KPS: 21/);
  assert.match(priority, /ESAS: 30/);
  assert.match(page, /priorityBeforeWeight/);
});

test("leituras do workspace são projetadas por tela e avaliações são filtradas pelas consultas vinculadas ao episódio", async () => {
  const read = await source("src/server/oncogeriatria/read.ts");
  assert.match(read, /OncogeriatricWorkspaceProjection/);
  assert.match(read, /consultationId: \{ in: linkedConsultationIds \}/);
  assert.match(read, /overview: 6/);
  assert.match(read, /scales: 2/);
  assert.match(read, /treatment: 2/);
  assert.match(read, /"post-treatment": 5/);
  assert.match(read, /longitudinal: 8/);
  assert.doesNotMatch(read, /projection: OncogeriatricWorkspaceProjection = "report"/);
});

test("ações de criação mantêm operationId estável durante retry e bloqueiam duplo clique", async () => {
  const files = await Promise.all([
    source("src/components/oncogeriatria/oncogeriatric-forms.tsx"),
    source("src/components/oncogeriatria/checkpoint-planner-form.tsx"),
    source("src/components/oncogeriatria/domain-linked-check-form.tsx"),
    source("src/components/oncogeriatria/report-actions.tsx"),
  ]);
  const joined = files.join("\n");
  assert.match(joined, /operationId/);
  assert.match(joined, /randomUUID/);
  assert.match(joined, /disabled=\{[^}]*pending/);
  assert.doesNotMatch(joined, /event\.currentTarget\.reset\(\)/);
});

test("marcos clínicos explícitos persistem consulta/checkpoint sem fabricar vínculo e rejeitam inconsistências", async () => {
  const [service, forms, checkForm, migration, rollback] = await Promise.all([
    source("src/server/oncogeriatria/service.ts"),
    source("src/components/oncogeriatria/oncogeriatric-forms.tsx"),
    source("src/components/oncogeriatria/domain-linked-check-form.tsx"),
    source("prisma/migrations/20260920223000_oncogeriatria_safe_persistence/migration.sql"),
    source("prisma/migrations/20260920223000_oncogeriatria_safe_persistence/ROLLBACK.md"),
  ]);
  assert.match(service, /resolveEventLinks/);
  assert.match(service, /EVENT_CONSULTATION_MISMATCH/);
  assert.match(service, /EVENT_TREATMENT_COURSE_MISMATCH/);
  assert.match(service, /consultationId, startedAt/);
  assert.match(service, /checkpointId, consultationId, occurredAt/);
  assert.match(service, /checkpointId, consultationId, domain/);
  assert.match(forms, /InterventionForm/);
  assert.match(forms, /name="checkpointId"/);
  assert.match(forms, /name="consultationId"/);
  assert.match(forms, /name="startedAt"/);
  assert.match(checkForm, /name="stroke"/);
  assert.match(migration, /OncoIntervention_consultation_patient_fkey/);
  assert.match(migration, /OncoToxicity_consultation_patient_fkey/);
  assert.match(migration, /OncoRecovery_consultation_patient_fkey/);
  assert.match(rollback, /OncoIntervention_consultation_patient_fkey/);
});
