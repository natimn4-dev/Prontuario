import assert from "node:assert/strict";
import test from "node:test";
import { buildAgaReportModel, renderAgaReportText } from "../../src/domain/aga-report.ts";
import { oncoPrognosisFamilyGuidance } from "../../src/domain/onco-prognosis-family-guidance.ts";
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

test("ECOG atual recebe cuidado domiciliar completo e orientação de contato", () => {
  const domain = domainsFor(["ecog"]).find((item) => item.code === "oncogeriatria")!;
  assert.match(domain.guidance.join(" "), /ECOG 2.*compras.*sem pressa.*objetos de uso diário/s);
  assert.match(domain.guidance.at(-1)!, /exigem avaliação imediata/);
  assert.ok(domain.evidenceReferences.some((reference) => reference.pmid === "7165009"));
  assert.ok(domain.evidenceReferences.some((reference) => reference.pmid === "31806655"));
});

test("KPS atual mantém orientações práticas sem descrever a escala", () => {
  const domain = domainsFor(["charlson", "kps"]).find((item) => item.code === "prognostico")!;
  const text = domain.guidance.join(" ");
  assert.match(text, /Karnofsky 60% — Combine quem poderá ajudar com compras/);
  assert.doesNotMatch(text, /índice de Charlson reúne|não determina quanto tempo/);
  assert.doesNotMatch(text, /Há necessidade de ajuda ocasional|O paciente mantém suas atividades/);
  assert.doesNotMatch(text, /\d+\s*(meses|anos)/);
  assert.doesNotMatch(text, /Converse com oncologia|avalie com a equipe|peça um plano|converse sobre apoio/i);
  assert.ok(domain.evidenceReferences.some((reference) => reference.pmid === "34991091"));
});

function guidanceAt(code: string, score: number | null) {
  const report = reportFor([code]);
  const scale = report.assessedScales.find((item) => item.code === code)!;
  return oncoPrognosisFamilyGuidance(scale.dimension, [{ ...scale, result: { ...scale.result, score } }])!.actions.join(" ");
}

test("cada resultado exato de ECOG e KPS recebe apenas suas orientações", () => {
  for (const [code, scores, label] of [
    ["ecog", [0, 1, 2, 3, 4], "ECOG"],
    ["kps", [100, 90, 80, 70, 60, 50, 40, 30, 20, 10], "Karnofsky"],
  ] as const) {
    for (const score of scores) {
      const text = guidanceAt(code, score);
      assert.ok(text.includes(`${label} ${score}`));
      assert.equal((text.match(code === "ecog" ? /ECOG \d+ —/g : /Karnofsky \d+%/g) ?? []).length, 1);
      assert.match(text, /exigem avaliação imediata/);
      assert.match(text, /decisões sobre o cuidado e os tratamentos são individualizadas/);
    }
  }
  assert.match(guidanceAt("ecog", 0), /Incentive a rotina/);
  assert.match(guidanceAt("ecog", 3), /No banho, na troca de roupa/);
  assert.doesNotMatch(guidanceAt("ecog", 3), /precisa de ajuda nos cuidados pessoais e passa mais da metade/);
  assert.match(guidanceAt("kps", 40), /No banho, na alimentação, na troca de roupa/);
  assert.doesNotMatch(guidanceAt("kps", 40), /precisa de ajuda importante nas atividades diárias/);
  assert.doesNotMatch(guidanceAt("ecog", 0), /todos os cuidados pessoais|Quem cuida também/);
  assert.match(guidanceAt("ecog", 3), /Quem cuida também precisa/);
  assert.match(guidanceAt("kps", 10), /Se a avaliação médica confirmar/);
  assert.match(guidanceAt("kps", 30), /Organize a presença de familiares ou cuidadores/);
  assert.match(guidanceAt("kps", 30), /decisões sobre tratamentos e o local do cuidado serão individualizadas/);
  assert.doesNotMatch(guidanceAt("kps", 30), /essa pontuação, sozinha/);
});

test("escore ausente, fora da escala ou fracionário não inventa estágio nem usa histórico", () => {
  for (const [code, scores] of [["ecog", [null, -1, 2.5, 5, NaN]], ["kps", [null, 0, 65, 101, NaN]]] as const) {
    for (const score of scores) assert.doesNotMatch(guidanceAt(code, score), /ECOG \d+ —|Karnofsky \d+%/);
  }
});

test("frases idênticas aparecem uma vez entre Oncogeriatria e Prognóstico", () => {
  const codes = ["ecog", "kps", "charlson"];
  const domains = domainsFor(codes);
  const allGuidance = domains.flatMap((domain) => domain.guidance);
  const shared = [
    "As decisões sobre o cuidado e os tratamentos são individualizadas e consideram a avaliação médica, as prioridades do paciente e as necessidades da família.",
    "Avise se houver aumento do cansaço, dor, falta de apetite, quedas, mais tempo na cama ou maior necessidade de ajuda. Essas mudanças podem ter diferentes causas e ajudam a ajustar o cuidado; não é preciso esperar a próxima visita para comunicá-las.",
    "Mantenha acessíveis os contatos de acompanhamento e o plano combinado para situações de piora. Falta de ar intensa, confusão súbita, dificuldade para despertar ou engasgo com dificuldade para respirar exigem avaliação imediata.",
  ];
  for (const action of shared) assert.equal(allGuidance.filter((item) => item === action).length, 1);
  assert.ok(domains.find((domain) => domain.code === "oncogeriatria")?.guidance.some((item) => /ECOG 2/.test(item)));
  assert.ok(domains.find((domain) => domain.code === "prognostico")?.guidance.some((item) => /Karnofsky 60%/.test(item)));
  assert.ok(domains.find((domain) => domain.code === "prognostico")?.evidenceReferences.some((item) => item.pmid === "34991091"));

  const rendered = renderAgaReportText(reportFor(codes));
  for (const action of shared) assert.equal(rendered.split(action).length - 1, 1);
});

test("mantém orientações dos instrumentos avaliados e preserva outros domínios", () => {
  const charlson = domainsFor(["charlson"])[0]!;
  assert.doesNotMatch(charlson.guidance.join(" "), /índice de Charlson reúne|doenças já existentes/);
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
