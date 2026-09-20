import assert from "node:assert/strict";
import test from "node:test";
import { buildAgaReportModel } from "../../src/domain/aga-report.ts";
import type { LongitudinalAssessment } from "../../src/domain/clinical-change-summary.ts";
import { scoreEat10 } from "../../src/domain/eat10.ts";
import { buildReportDomainSummaries } from "../../src/domain/report-domain-summary.ts";
import { scoreWalkingAidContext } from "../../src/domain/walking-aid-context.ts";

const zeroEat10 = {
  weight_loss: 0,
  eating_out: 0,
  liquids: 0,
  solids: 0,
  pills: 0,
  pain: 0,
  pleasure: 0,
  sticking: 0,
  cough: 0,
  stress: 0,
};

test("EAT-10 calcula 0–40 e usa corte >=3 para rastreio positivo", () => {
  const negative = scoreEat10(zeroEat10);
  assert.equal(negative.result.score, 0);
  assert.match(negative.result.classification, /negativo/i);
  assert.equal(negative.result.clinicalColor, "verde");

  const positive = scoreEat10({ ...zeroEat10, cough: 3 });
  assert.equal(positive.result.score, 3);
  assert.match(positive.result.classification, /positivo/i);
  assert.match(positive.result.interpretation, /fonoaudiólogo/i);
  assert.equal(positive.result.clinicalColor, "vermelho");

  assert.throws(() => scoreEat10({ ...zeroEat10, cough: 5 }), /EAT-10 inválido/i);
});

test("registro de dispositivo exige tipo somente quando o uso está marcado", () => {
  const none = scoreWalkingAidContext({ usesWalkingAid: 0 });
  assert.match(none.result.scoreText, /não utiliza/i);
  assert.equal(none.result.clinicalColor, undefined);

  const cane = scoreWalkingAidContext({ usesWalkingAid: 1, walkingAidType: "Bengala" });
  assert.equal(cane.result.scoreText, "Bengala");
  assert.match(cane.result.classification, /utiliza dispositivo/i);
  assert.equal(cane.result.clinicalColor, undefined);

  assert.throws(
    () => scoreWalkingAidContext({ usesWalkingAid: 1 }),
    /selecione o tipo/i,
  );
});

function mobilityDomain(input: {
  usesWalkingAid?: 0 | 1;
  walkingAidType?: string;
}) {
  const assessments: LongitudinalAssessment[] = [
    {
      patientId: "patient-mobility",
      consultationId: "consultation-current",
      scaleCode: "preensao",
      scaleVersion: "1.0",
      score: 12,
      scoreText: "12 kgF",
      classification: "Força de preensão reduzida",
      interpretation: "Força reduzida.",
      color: "vermelho" as const,
      answers: { score: 12, sex: "Feminino" },
      appliedAt: "2026-09-20",
    },
  ];

  if (input.usesWalkingAid !== undefined) {
    assessments.push({
      patientId: "patient-mobility",
      consultationId: "consultation-current",
      scaleCode: "walking_aid_context",
      scaleVersion: "walking-aid-context-2026-09-v1",
      score: input.usesWalkingAid,
      scoreText: input.usesWalkingAid === 1 ? input.walkingAidType ?? "Outro" : "Não utiliza dispositivo de locomoção",
      classification: input.usesWalkingAid === 1
        ? "Utiliza dispositivo de auxílio à locomoção"
        : "Sem dispositivo de auxílio à locomoção registrado",
      interpretation: "Registro contextual.",
      color: undefined,
      answers: input.usesWalkingAid === 1
        ? { usesWalkingAid: 1, walkingAidType: input.walkingAidType ?? "Outro" }
        : { usesWalkingAid: 0 },
      appliedAt: "2026-09-20",
    });
  }

  const report = buildAgaReportModel({
    patientId: "patient-mobility",
    consultationId: "consultation-current",
    consultationStatus: "IN_REVIEW",
    patientName: "Paciente Sintético",
    longitudinalProblems: [],
    longitudinalAssessments: assessments,
  });

  return buildReportDomainSummaries(report.assessedScales, report.intrinsicCapacity)
    .find((domain) => domain.code === "mobilidade");
}

test("preensão reduzida gera risco de queda e orientação fisioterapêutica sem inventar dispositivo", () => {
  const mobility = mobilityDomain({ usesWalkingAid: 0 });
  const guidance = mobility?.guidance.join(" ") ?? "";

  assert.equal(mobility?.state, "altered");
  assert.ok(mobility?.results.every((result) => result.scaleCode !== "walking_aid_context"));
  assert.doesNotMatch(mobility?.results.map((result) => result.value).join(" ") ?? "", /não utiliza dispositivo|sem dispositivo/i);
  assert.match(guidance, /chance de quedas/i);
  assert.match(guidance, /Fisioterapia/i);
  assert.match(guidance, /força de membros inferiores, equilíbrio, marcha, transferências/i);
  assert.doesNotMatch(guidance, /bengala|andador|muletas|cadeira de rodas/i);
  assert.ok(mobility?.evidenceReferences.some((reference) => reference.pmid === "37155689"));
});

test("orientação de dispositivo só aparece quando o uso está registrado e é específica", () => {
  const mobility = mobilityDomain({ usesWalkingAid: 1, walkingAidType: "Andador" });
  const guidance = mobility?.guidance.join(" ") ?? "";

  assert.match(guidance, /uso de andador/i);
  assert.match(guidance, /ajuste, a forma de uso/i);
  assert.match(guidance, /fisioterapeuta/i);
  assert.doesNotMatch(guidance, /bengala, andador/i);
});

test("EAT-10 positivo gera orientação fonoaudiológica e oferta segura sem mudança empírica de consistência", () => {
  const report = buildAgaReportModel({
    patientId: "patient-eat10",
    consultationId: "consultation-current",
    consultationStatus: "IN_REVIEW",
    patientName: "Paciente Sintético",
    longitudinalProblems: [],
    longitudinalAssessments: [{
      patientId: "patient-eat10",
      consultationId: "consultation-current",
      scaleCode: "eat10",
      scaleVersion: "eat10-br-goncalves-2013-v1",
      score: 3,
      scoreText: "3/40",
      classification: "Rastreio positivo para risco de disfagia",
      interpretation: "EAT-10 >= 3.",
      color: "vermelho",
      answers: { ...zeroEat10, cough: 3 },
      appliedAt: "2026-09-20",
    }],
  });

  const nutrition = buildReportDomainSummaries(report.assessedScales, report.intrinsicCapacity)
    .find((domain) => domain.code === "nutricao");
  const guidance = nutrition?.guidance.join(" ") ?? "";
  const eat10 = report.assessedScales.find((scale) => scale.code === "eat10");

  assert.equal(nutrition?.state, "altered");
  assert.match(guidance, /fonoaudiólogo/i);
  assert.match(guidance, /sentada e ereta/i);
  assert.match(guidance, /Não espesse líquidos nem mude a textura/i);
  assert.ok(nutrition?.evidenceReferences.some((reference) => reference.pmid === "19140539"));
  assert.ok(nutrition?.evidenceReferences.some((reference) => reference.pmid === "24626972"));
  assert.ok(nutrition?.evidenceReferences.some((reference) => reference.pmid === "40543044"));
  assert.ok(eat10?.relatedProblemProposals.some((problem) => problem.title === "Risco de disfagia"));
});
