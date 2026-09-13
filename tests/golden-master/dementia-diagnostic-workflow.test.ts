import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildDementiaReportDraft,
  cognitiveScaleFamily,
  cognitiveScaleName,
  emptyDementiaAssessmentDraft,
  interpretDementiaAssessment,
} from "../../src/domain/dementia-assessment.ts";
import { parseDementiaAssessmentSave } from "../../src/server/clinical/dementia-assessment-http.ts";

const source = (path: string) => readFile(new URL(`../../${path}`, import.meta.url), "utf8");

test("condição aguda interrompe o fluxo eletivo sem rotular demência", () => {
  const draft = emptyDementiaAssessmentDraft();
  draft.safety.acuteOnset = "YES";
  const result = interpretDementiaAssessment(draft);
  assert.equal(result.pathway, "URGENT_ACUTE");
  assert.match(result.pathwayLabel, /condição aguda/i);
  assert.doesNotMatch(result.pathwayLabel, /diagnóstico de demência/i);
});

test("declínio rapidamente progressivo recebe via especializada separada", () => {
  const draft = emptyDementiaAssessmentDraft();
  draft.safety.acuteOnset = "NO";
  draft.safety.acuteFluctuation = "NO";
  draft.safety.newFocalDeficit = "NO";
  draft.safety.rapidlyProgressive = "YES";
  const result = interpretDementiaAssessment(draft);
  assert.equal(result.pathway, "URGENT_RAPID");
  assert.match(result.alerts.join(" "), /semanas ou poucos meses/i);
});

test("características centrais de Lewy usam flutuação persistente e não flutuação aguda", () => {
  const draft = emptyDementiaAssessmentDraft();
  draft.safety.acuteOnset = "NO";
  draft.safety.acuteFluctuation = "NO";
  draft.safety.newFocalDeficit = "NO";
  draft.safety.rapidlyProgressive = "NO";
  draft.keyFeatures.cognitiveFluctuations = "YES";
  draft.keyFeatures.visualHallucinations = "YES";
  draft.keyFeatures.spontaneousParkinsonism = "YES";
  draft.keyFeatures.remSleepBehavior = "YES";
  const result = interpretDementiaAssessment(draft);
  const lewy = result.hypotheses.find((item) => item.etiology === "LEWY_BODY");
  assert.equal(lewy?.support, "HIGH");
  assert.match(lewy?.supporting.join(" ") ?? "", /persistentes/i);
  assert.equal(result.pathway, "INCOMPLETE");
});

test("hipótese vascular exige integração clínico-radiológica e não apenas risco vascular", () => {
  const draft = emptyDementiaAssessmentDraft();
  draft.keyFeatures.vascularRisk = "YES";
  let vascular = interpretDementiaAssessment(draft).hypotheses.find((item) => item.etiology === "VASCULAR");
  assert.equal(vascular?.support, "LOW");
  assert.match(vascular?.limiting.join(" ") ?? "", /carga de lesão vascular suficiente/i);

  draft.clinical.course = "STEPWISE";
  draft.keyFeatures.previousStroke = "YES";
  draft.imaging.vascularBurden = "MARKED";
  draft.imaging.strategicInfarcts = "YES";
  vascular = interpretDementiaAssessment(draft).hypotheses.find((item) => item.etiology === "VASCULAR");
  assert.equal(vascular?.support, "HIGH");
});

test("LATE permanece hipótese probabilística e amiloide negativo aumenta apoio", () => {
  const draft = emptyDementiaAssessmentDraft();
  draft.clinical.ageBand = "85_OR_MORE";
  draft.clinical.profile = "AMNESTIC";
  draft.clinical.course = "INSIDIOUS";
  draft.imaging.hippocampalDisproportion = "MARKED";
  draft.biomarkers.amyloid = "NEGATIVE";
  const late = interpretDementiaAssessment(draft).hypotheses.find((item) => item.etiology === "LATE");
  assert.equal(late?.support, "HIGH");
  assert.match(late?.supporting.join(" ") ?? "", /provável causa primária/i);
  assert.match(interpretDementiaAssessment(draft).disclaimer, /probabilísticas/i);
});

test("relatório é editável, explicita lacunas e não transforma sugestão em diagnóstico", () => {
  const draft = emptyDementiaAssessmentDraft();
  const report = buildDementiaReportDraft(draft);
  assert.match(report, /Ainda não definida pelo médico/i);
  assert.match(report, /Dados pendentes para integração/i);
  assert.match(report, /revisão médica explícita/i);
  assert.doesNotMatch(report, /diagnóstico confirmado/i);
});

test("variantes da mesma escala cognitiva são tratadas como uma única família", () => {
  assert.equal(cognitiveScaleFamily("meem_freitas"), cognitiveScaleFamily("meem"));
  assert.equal(cognitiveScaleFamily("moca_br_freitas"), cognitiveScaleFamily("moca"));
  assert.equal(cognitiveScaleName("relogio"), "Teste do Relógio");
});

test("fronteira HTTP rejeita campos desconhecidos, identidade do cliente e relatório ausente", () => {
  const draft = emptyDementiaAssessmentDraft();
  assert.throws(() => parseDementiaAssessmentSave({ expectedLatestVersion: 0, ...draft }), /relatório/i);
  draft.reportText = "Rascunho revisável";
  assert.throws(() => parseDementiaAssessmentSave({ expectedLatestVersion: 0, ...draft, patientId: "forged" }), /campos não permitidos/i);
  assert.throws(() => parseDementiaAssessmentSave({ expectedLatestVersion: 0, ...draft, safety: { ...draft.safety, extra: true } }), /campos não permitidos/i);
  const parsed = parseDementiaAssessmentSave({ expectedLatestVersion: 0, ...draft });
  assert.equal(parsed.draft.reportText, "Rascunho revisável");
});

test("persistência é aditiva, vinculada ao par paciente-consulta e auditada", async () => {
  const [schema, migration, service, context] = await Promise.all([
    source("prisma/schema.prisma"),
    source("prisma/migrations/20260913153000_dementia_diagnostic_workflow/migration.sql"),
    source("src/server/clinical/dementia-assessment.ts"),
    source("src/server/clinical/dementia-assessment-workspace-context.ts"),
  ]);
  assert.match(schema, /model CognitiveDiagnosticAssessment/);
  assert.match(schema, /@@unique\(\[consultationId, version\]\)/);
  assert.match(schema, /relation\(fields: \[consultationId, patientId\], references: \[id, patientId\]/);
  assert.match(migration, /CREATE TABLE `CognitiveDiagnosticAssessment`/);
  assert.doesNotMatch(migration, /DROP TABLE|DELETE FROM|TRUNCATE/i);
  assert.match(service, /cognitiveDiagnosticAssessment\.create/);
  assert.doesNotMatch(service, /cognitiveDiagnosticAssessment\.(update|delete)/);
  assert.match(service, /expectedLatestVersion/);
  assert.match(service, /isolationLevel: "Serializable"/);
  assert.match(service, /dementia-assessment\.record\.create/);
  assert.match(context, /patientId: consultation\.patientId/);
  assert.match(context, /consultationId: consultation\.id/);
});

test("documento exige revisão, gera snapshot e mantém identidade server-side", async () => {
  const [generator, snapshot, workspace] = await Promise.all([
    source("src/server/clinical/generate-dementia-report.ts"),
    source("src/server/clinical/document-snapshot-transaction.ts"),
    source("src/components/consultations/dementia-assessment-workspace.tsx"),
  ]);
  assert.match(generator, /if \(!assessment\.clinicianReviewed\)/);
  assert.match(generator, /type: "DEMENTIA_REPORT"/);
  assert.match(generator, /patientId: consultation\.patientId/);
  assert.match(snapshot, /"DEMENTIA_REPORT"/);
  assert.match(workspace, /Apoio à decisão, não diagnóstico automático/);
  assert.match(workspace, /Confirmo que revisei o conteúdo clínico/);
  assert.match(workspace, /dirty \|\| !draft\.clinicianReviewed/);
});

test("workspace incorpora a tela sem alterar SOAP, medicamentos ou relatório familiar", async () => {
  const [workspace, soap, medications, familyReport] = await Promise.all([
    source("src/components/consultations/consultation-workspace.tsx"),
    source("src/components/consultations/soap-editor.tsx"),
    source("src/components/medications/medication-workspace.tsx"),
    source("src/components/reports/aga-report-document-preview.tsx"),
  ]);
  assert.match(workspace, /id: "demencia"/);
  assert.match(workspace, /DementiaAssessmentWorkspace consultationId=\{consultationId\}/);
  assert.doesNotMatch(soap, /dementia-assessment/);
  assert.doesNotMatch(medications, /dementia-assessment/);
  assert.doesNotMatch(familyReport, /dementia-assessment/);
});
