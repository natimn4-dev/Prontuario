import assert from "node:assert/strict";
import test from "node:test";
import { buildAgaReportModel } from "../../src/domain/aga-report.ts";
import type { LongitudinalAssessment } from "../../src/domain/clinical-change-summary.ts";
import { scoreEat10 } from "../../src/domain/eat10.ts";
import { buildReportDomainSummaries } from "../../src/domain/report-domain-summary.ts";
import { WALKING_AID_CONTEXT_DEFINITION, scoreWalkingAidContext } from "../../src/domain/walking-aid-context.ts";

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

test("registro de apoio contempla dispositivo, ajuda de terceiros, não deambulação e tempo sentado/deitado", () => {
  const none = scoreWalkingAidContext({ usesWalkingAid: 0 });
  assert.match(none.result.scoreText, /não utiliza/i);
  assert.equal(none.result.clinicalColor, undefined);

  const cane = scoreWalkingAidContext({ usesWalkingAid: 1, walkingAidType: "Bengala" });
  assert.equal(cane.result.scoreText, "Bengala");
  assert.match(cane.result.classification, /utiliza dispositivo/i);
  assert.equal(cane.result.clinicalColor, undefined);

  const assisted = scoreWalkingAidContext({
    usesWalkingAid: 1,
    walkingAidType: "Ajuda de terceiros",
    mostlySeatedOrLying: 1,
  });
  assert.match(assisted.result.classification, /caminha apenas com ajuda/i);
  assert.deepEqual(assisted.answers, {
    usesWalkingAid: 1,
    walkingAidType: "Ajuda de terceiros",
    mostlySeatedOrLying: 1,
  });

  const nonAmbulatory = scoreWalkingAidContext({ usesWalkingAid: 1, walkingAidType: "Não deambula" });
  assert.match(nonAmbulatory.result.classification, /não deambula/i);

  const typeField = WALKING_AID_CONTEXT_DEFINITION.fields.find((field) => field.id === "walkingAidType");
  assert.ok(typeField && "choices" in typeField);
  const labels = typeField?.choices?.map((choice) => String(choice.label)) ?? [];
  assert.ok(labels.includes("Caminha apenas com ajuda de outra pessoa"));
  assert.ok(labels.includes("Não caminha"));
  assert.ok(WALKING_AID_CONTEXT_DEFINITION.fields.some((field) => field.id === "mostlySeatedOrLying"));

  assert.throws(
    () => scoreWalkingAidContext({ usesWalkingAid: 1 }),
    /selecione o tipo/i,
  );
});

function mobilityDomain(input: {
  usesWalkingAid?: 0 | 1;
  walkingAidType?: string;
  mostlySeatedOrLying?: 0 | 1;
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
      scaleVersion: "walking-aid-context-2026-09-v2",
      score: input.usesWalkingAid,
      scoreText: input.usesWalkingAid === 1 ? input.walkingAidType ?? "Outro" : "Não utiliza dispositivo de locomoção",
      classification: input.usesWalkingAid === 1
        ? "Utiliza dispositivo de auxílio à locomoção"
        : "Sem dispositivo de auxílio à locomoção registrado",
      interpretation: "Registro contextual.",
      color: undefined,
      answers: input.usesWalkingAid === 1
        ? {
          usesWalkingAid: 1,
          walkingAidType: input.walkingAidType ?? "Outro",
          ...(input.mostlySeatedOrLying === undefined ? {} : { mostlySeatedOrLying: input.mostlySeatedOrLying }),
        }
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
  assert.match(guidance, /força das pernas, equilíbrio, marcha e transferências/i);
  assert.doesNotMatch(guidance, /bengala|andador|muletas|cadeira de rodas/i);
  assert.ok(mobility?.evidenceReferences.some((reference) => reference.pmid === "37155689"));
});

test("orientação de dispositivo só aparece quando o uso está registrado e é específica", () => {
  const mobility = mobilityDomain({ usesWalkingAid: 1, walkingAidType: "Andador" });
  const guidance = mobility?.guidance.join(" ") ?? "";

  assert.match(guidance, /Converse com o seu fisioterapeuta sobre o ajuste e o uso correto do seu andador/i);
  assert.match(guidance, /Mantenha o andador ao alcance/i);
  assert.doesNotMatch(guidance, /Como a pessoa usa|vale pedir/i);
  assert.doesNotMatch(guidance, /bengala, andador/i);
});

test("ajuda de terceiros com maior parte do dia sentada ou deitada ativa prevenção de lesão por pressão e contraturas", () => {
  const mobility = mobilityDomain({
    usesWalkingAid: 1,
    walkingAidType: "Ajuda de terceiros",
    mostlySeatedOrLying: 1,
  });
  const guidance = mobility?.guidance.join(" ") ?? "";

  assert.equal(mobility?.state, "altered");
  assert.match(guidance, /caminha apenas com ajuda de outra pessoa/i);
  assert.match(guidance, /variar a posição ao longo do dia/i);
  assert.match(guidance, /cóccix|nádegas|calcanhares/i);
  assert.match(guidance, /reduzir o risco de contraturas/i);
  assert.match(guidance, /participe|participação/i);
  assert.doesNotMatch(guidance, /a cada 2 horas|de duas em duas horas/i);
  assert.ok(mobility?.evidenceReferences.some((reference) => reference.pmid === "42240176"));
  assert.ok(mobility?.evidenceReferences.some((reference) => reference.pmid === "23772994"));
  assert.ok(mobility?.evidenceReferences.some((reference) => reference.pmid === "21638258"));
});

test("ajuda de terceiros sem permanência prolongada sentada ou deitada não recebe automaticamente cuidados de pressão", () => {
  const mobility = mobilityDomain({
    usesWalkingAid: 1,
    walkingAidType: "Ajuda de terceiros",
    mostlySeatedOrLying: 0,
  });
  const guidance = mobility?.guidance.join(" ") ?? "";

  assert.match(guidance, /forma mais segura de apoiar a marcha e as transferências/i);
  assert.doesNotMatch(guidance, /cóccix|redistribuir a pressão|contraturas/i);
});

test("não deambulação ativa cuidados preventivos mesmo sem marcar permanência sentada ou deitada", () => {
  const mobility = mobilityDomain({
    usesWalkingAid: 1,
    walkingAidType: "Não deambula",
  });
  const guidance = mobility?.guidance.join(" ") ?? "";

  assert.match(guidance, /Mesmo sem estar caminhando/i);
  assert.match(guidance, /não force a marcha/i);
  assert.match(guidance, /pele todos os dias/i);
  assert.match(guidance, /contraturas/i);
});

test("orientação respeita o tipo de dispositivo registrado e a concordância da frase", () => {
  const cases = [
    ["Bengala", /uso correto da sua bengala/i],
    ["Muletas", /uso correto das suas muletas/i],
    ["Cadeira de rodas", /uso correto da sua cadeira de rodas/i],
  ] as const;

  for (const [walkingAidType, expected] of cases) {
    const mobility = mobilityDomain({ usesWalkingAid: 1, walkingAidType });
    const guidance = mobility?.guidance.join(" ") ?? "";

    assert.match(guidance, expected);
    assert.doesNotMatch(guidance, /Como a pessoa usa|vale pedir/i);
  }
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
  assert.match(guidance, /bem sentada/i);
  assert.match(guidance, /Evite engrossar líquidos ou mudar a textura/i);
  assert.ok(nutrition?.evidenceReferences.some((reference) => reference.pmid === "19140539"));
  assert.ok(nutrition?.evidenceReferences.some((reference) => reference.pmid === "24626972"));
  assert.ok(nutrition?.evidenceReferences.some((reference) => reference.pmid === "40543044"));
  assert.ok(eat10?.relatedProblemProposals.some((problem) => problem.title === "Risco de disfagia"));
});
