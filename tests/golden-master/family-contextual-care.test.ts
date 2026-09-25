import assert from "node:assert/strict";
import test from "node:test";
import {
  applyContextualFamilyCarePlan,
  contextualizeImmobilityDomainGuidance,
  deriveEstablishedImmobilityContext,
  gastrostomyFamilyGuidance,
  hasGastrostomyMedicationRoute,
} from "../../src/domain/family-contextual-care.ts";

const fastScale = (score: number) => ({
  code: "fast",
  assessedInTargetConsultation: true,
  result: { score },
});

test("FAST 7c ou superior estabelece imobilidade e elimina metas incompatíveis", () => {
  const immobility = deriveEstablishedImmobilityContext({ scales: [fastScale(7.3)] });
  assert.equal(immobility.established, true);
  assert.equal(immobility.source, "FAST_7C_OR_HIGHER");
  assert.equal(immobility.fastStage, "7c");

  const contextual = applyContextualFamilyCarePlan({
    plan: {
      now: [
        "Caminhar 20 minutos por dia.",
        "Iniciar treino de força (exercício resistido) para membros superiores e inferiores, 2 a 3 vezes por semana, com carga progressiva.",
        "Pesar o paciente uma vez por mês, sempre na mesma balança e no mesmo horário, e anotar em um caderno.",
        "Manter rotina de sono.",
      ],
      mediumTerm: ["Treinar marcha de forma independente."],
      caregiver: ["Estimular caminhadas diárias e atividades que exijam força."],
      referrals: ["Fisioterapia"],
      contact: [],
      urgent: [],
    },
    immobility,
    gastrostomyPresent: false,
  });

  const text = [...contextual.now, ...contextual.mediumTerm, ...contextual.caregiver].join(" ");
  assert.doesNotMatch(text, /caminhar 20|minutos.*caminh|marcha de forma independente|estimular caminhadas/i);
  assert.doesNotMatch(text, /treino de força|exercício resistido|carga progressiva|mesma balança/i);
  assert.doesNotMatch(text, /FAST 7c/i);
  assert.match(text, /não conseguir caminhar de forma independente/i);
  assert.match(text, /transferências/i);
  assert.match(text, /contraturas/i);
  assert.match(text, /cóccix|nádegas|calcanhares/i);
  assert.match(text, /Manter rotina de sono/i);
});

test("problema geriátrico Imobilidade aplica as mesmas prioridades sem inventar FAST", () => {
  const immobility = deriveEstablishedImmobilityContext({
    scales: [],
    geriatricProblems: [{ title: "Imobilidade", status: "ACTIVE" }],
  });
  assert.equal(immobility.established, true);
  assert.equal(immobility.source, "GERIATRIC_PROBLEM");
  assert.equal(immobility.fastScore, undefined);

  const contextual = applyContextualFamilyCarePlan({
    plan: {
      now: ["Iniciar treino de força para membros superiores e inferiores 3 vezes por semana."],
      mediumTerm: [],
      caregiver: [],
      referrals: [],
      contact: [],
      urgent: [],
    },
    immobility,
    gastrostomyPresent: false,
  });
  assert.match(contextual.now.join(" "), /imobilidade já faz parte do quadro atual/i);
  assert.match(contextual.caregiver.join(" "), /transferências/i);
  assert.doesNotMatch(contextual.now.join(" "), /treino de força/i);
});

test("aba Locomoção traduz imobilidade em cuidados preventivos sem expor FAST", () => {
  const immobility = deriveEstablishedImmobilityContext({ scales: [fastScale(7.4)] });
  const summary = contextualizeImmobilityDomainGuidance(
    "mobilidade",
    ["orientação genérica"],
    immobility,
  );
  const text = summary.join(" ");

  assert.equal(summary.length, 4);
  assert.match(text, /preservar conforto, segurança e participação/i);
  assert.match(text, /variar a posição ao longo do dia/i);
  assert.match(text, /pele diariamente/i);
  assert.match(text, /reduzir o risco de contraturas/i);
  assert.doesNotMatch(text, /FAST|a cada 2 horas|de duas em duas horas/i);
});

test("tabela resume imobilidade sem repetir literalmente o plano detalhado", () => {
  const immobility = deriveEstablishedImmobilityContext({ scales: [fastScale(7.4)] });
  const summary = contextualizeImmobilityDomainGuidance(
    "funcionalidade",
    ["orientação genérica"],
    immobility,
  );
  const detailed = applyContextualFamilyCarePlan({
    plan: { now: [], mediumTerm: [], caregiver: [], referrals: [], contact: [], urgent: [] },
    immobility,
    gastrostomyPresent: false,
  });

  assert.equal(summary.length, 1);
  assert.match(summary[0]!, /priorize conforto e segurança/i);
  assert.ok(!detailed.now.includes(summary[0]!));
  assert.ok(!detailed.caregiver.includes(summary[0]!));
});

test("via GTT ativa cuidados específicos de gastrostomia sem inventar dieta, volume ou diluição", () => {
  assert.equal(hasGastrostomyMedicationRoute([{ route: "Via gastrostomia (GTT)", status: "ACTIVE" }]), true);
  assert.equal(hasGastrostomyMedicationRoute([{ route: "Via oral", status: "ACTIVE" }]), false);
  const guidance = gastrostomyFamilyGuidance();
  const text = [...guidance.now, ...guidance.caregiver, ...guidance.contact].join(" ");
  assert.match(text, /dieta enteral/i);
  assert.match(text, /antes de triturar um comprimido/i);
  assert.match(text, /estoma/i);
  assert.match(text, /volume prescrito/i);
  assert.doesNotMatch(text, /\b\d+\s*mL\b/i);
  assert.doesNotMatch(text, /\b\d+\s*kcal\b/i);
});
