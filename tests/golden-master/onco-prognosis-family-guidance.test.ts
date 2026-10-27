import assert from "node:assert/strict";
import test from "node:test";
import { buildAgaReportModel, renderAgaReportText } from "../../src/domain/aga-report.ts";
import { buildReportDomainSummaries } from "../../src/domain/report-domain-summary.ts";

function reportFor(codes: string[], consultationId = "synthetic-current", patientId = "synthetic-onco") {
  return buildAgaReportModel({
    patientId: "synthetic-onco", consultationId: "synthetic-current",
    consultationStatus: "IN_REVIEW", patientName: "Paciente Sintético", longitudinalProblems: [],
    longitudinalAssessments: codes.map((scaleCode) => ({
      patientId, consultationId, scaleCode, scaleVersion: "1.0", score: scaleCode === "kps" ? 60 : 2,
      color: "amarelo", appliedAt: "2026-10-27",
    })),
  });
}
function domainsFor(codes: string[], consultationId?: string) {
  const report = reportFor(codes, consultationId);
  return buildReportDomainSummaries(report.assessedScales, report.intrinsicCapacity);
}

test("relatório mantém orientação completa e contato ao avaliar ECOG", () => {
  const domain = domainsFor(["ecog"]).find((item) => item.code === "oncogeriatria")!;
  assert.equal(domain.guidance.length, 5);
  assert.match(domain.guidance.join(" "), /ECOG descreve.*não determina, sozinho/);
  assert.match(domain.guidance.at(-1)!, /canal de contato.*sem esperar/);
  assert.ok(domain.evidenceReferences.some((reference) => reference.pmid === "37459573"));
  assert.ok(domain.evidenceReferences.some((reference) => reference.pmid === "31806655"));
});

test("Charlson e Karnofsky explicados separadamente sem estimativa individual de sobrevida", () => {
  const domain = domainsFor(["charlson", "kps"]).find((item) => item.code === "prognostico")!;
  assert.equal(domain.guidance.length, 5);
  const text = domain.guidance.join(" ");
  assert.match(text, /Charlson.*não prevê com precisão/);
  assert.match(text, /Karnofsky.*retrata o momento/);
  assert.match(text, /preferências da pessoa/);
  assert.match(text, /junto ao tratamento do câncer quando indicado/);
  assert.match(domain.guidance.at(-1)!, /procure atendimento imediatamente/);
  assert.doesNotMatch(text, /\d+\s*(meses|anos|%)/);
  assert.ok(domain.evidenceReferences.some((reference) => reference.pmid === "34991091"));
  assert.ok(domain.evidenceReferences.some((reference) => reference.pmid === "38748941"));
});

test("explica apenas instrumentos avaliados na consulta e preserva outros domínios", () => {
  const charlson = domainsFor(["charlson"])[0]!;
  assert.match(charlson.guidance.join(" "), /Charlson/);
  assert.doesNotMatch(charlson.guidance.join(" "), /Karnofsky|ECOG/);
  const kps = domainsFor(["kps"])[0]!;
  assert.match(kps.guidance.join(" "), /Karnofsky/);
  assert.doesNotMatch(kps.guidance.join(" "), /Charlson|ECOG/);
  const g8 = domainsFor(["g8"])[0]!;
  assert.doesNotMatch(g8.guidance.join(" "), /ECOG/);
  assert.deepEqual(domainsFor([]), []);
  assert.deepEqual(domainsFor(["ecog", "charlson", "kps"], "synthetic-previous"), []);
  assert.deepEqual(domainsFor(["barthel"]), domainsFor(["barthel", "ecog"]).filter((item) => item.code !== "oncogeriatria"));
});

test("modelo do relatório continua isolando pacientes e mantém escores após serialização", () => {
  assert.throws(() => reportFor(["ecog"], "synthetic-current", "synthetic-other"));
  const report = reportFor(["charlson", "kps", "ecog"]);
  const persisted = JSON.parse(JSON.stringify(report));
  assert.deepEqual(buildReportDomainSummaries(persisted.assessedScales, persisted.intrinsicCapacity),
    buildReportDomainSummaries(report.assessedScales, report.intrinsicCapacity));
  assert.deepEqual(report.assessedScales.map((scale) => scale.result.score).sort((a, b) => a! - b!), [2, 2, 60]);
});


test("exportação textual mantém as mesmas orientações e referências da tabela", () => {
  const report = reportFor(["charlson", "kps", "ecog"]);
  const text = renderAgaReportText(report);
  for (const domain of buildReportDomainSummaries(report.assessedScales, report.intrinsicCapacity)) {
    for (const action of domain.guidance) assert.ok(text.includes(action));
    for (const reference of domain.evidenceReferences) assert.ok(text.includes(reference.url));
  }
  assert.doesNotMatch(renderAgaReportText(reportFor(["ecog", "charlson", "kps"], "synthetic-previous")), /ORIENTAÇÕES PARA PACIENTE E FAMÍLIA — (ONCOGERIATRIA|PROGNÓSTICO)/);
});
