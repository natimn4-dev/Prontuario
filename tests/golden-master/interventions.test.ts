import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCombinedPlan,
  interventionFor,
  mergeInterventionPlans,
} from "../../src/domain/interventions.ts";

test("interventionFor não gera plano para resultado cinza", () => {
  const plan = interventionFor("sarcf", "cinza");
  assert.deepEqual(plan.agora, []);
  assert.deepEqual(plan.encaminhamentos, []);
});

test("SARC-F vermelho mantém plano extraído do legado", () => {
  const plan = interventionFor("sarcf", "vermelho");
  assert.ok(plan.agora[0]?.includes("Iniciar treino de força"));
  assert.deepEqual(plan.encaminhamentos, ["Fisioterapia", "Nutrição"]);
});

test("mergeInterventionPlans remove duplicações preservando ordem", () => {
  const plan = mergeInterventionPlans(
    { encaminhamentos: ["Fisioterapia", "Nutrição"] },
    { encaminhamentos: ["Fisioterapia", "Educador físico"] },
  );
  assert.deepEqual(plan.encaminhamentos, [
    "Fisioterapia",
    "Nutrição",
    "Educador físico",
  ]);
});

test("buildCombinedPlan agrega domínios sem repetir encaminhamento", () => {
  const plan = buildCombinedPlan([
    { scaleId: "sarcf", color: "vermelho" },
    { scaleId: "preensao", color: "vermelho" },
    { scaleId: "sppb", color: "vermelho" },
  ]);
  assert.equal(plan.encaminhamentos.filter((x) => x === "Fisioterapia").length, 1);
  assert.ok(plan.agora.length >= 3);
});

test("Lawton vermelho mantém medidas funcionais extraídas do legado", () => {
  const plan = interventionFor("lawton", "vermelho");
  assert.ok(plan.agora.some((item) => item.includes("contas e os medicamentos")));
  assert.deepEqual(plan.encaminhamentos, ["Terapia ocupacional", "Serviço social"]);
});

test("Pfeffer vermelho mantém supervisão de segurança e encaminhamentos", () => {
  const plan = interventionFor("pfeffer", "vermelho");
  assert.ok(plan.agora.some((item) => item.includes("fogão, dinheiro ou medicamentos")));
  assert.deepEqual(plan.encaminhamentos, ["Terapia ocupacional", "Neuropsicologia"]);
});

test("Barthel vermelho mantém reabilitação e prevenção de lesão por pressão", () => {
  const plan = interventionFor("barthel", "vermelho");
  assert.ok(plan.agora.some((item) => item.includes("áreas de pressão")));
  assert.ok(plan.medio.some((item) => item.includes("reabilitação pode ser organizada")));
  assert.deepEqual(plan.encaminhamentos, ["Fisioterapia", "Terapia ocupacional", "Enfermagem"]);
});

test("G8 positivo direciona para AGA e oncogeriatria", () => {
  const plan = interventionFor("g8", "vermelho");
  assert.ok(plan.agora[0]?.includes("Avaliação Geriátrica Ampla completa"));
  assert.deepEqual(plan.encaminhamentos, ["Geriatria / Oncogeriatria"]);
});

test("polifarmácia de alto risco mantém revisão e Farmácia clínica", () => {
  const plan = interventionFor("polifarmacia", "vermelho");
  assert.ok(plan.medio.some((item) => item.includes("desprescrição planejada")));
  assert.deepEqual(plan.encaminhamentos, ["Farmácia clínica"]);
});

test("APGAR familiar alterado mantém suporte social extraído do legado", () => {
  const plan = interventionFor("apgar_familiar", "vermelho");
  assert.ok(plan.agora.some((item) => item.includes("pessoa de referência")));
  assert.deepEqual(plan.encaminhamentos, ["Serviço social", "Psicologia"]);
  assert.equal(plan.urgencia.length, 1);
});

test("Zarit intensa mantém pausa programada e apoio ao cuidador", () => {
  const plan = interventionFor("zarit_reduzida", "vermelho");
  assert.ok(plan.agora.some((item) => item.includes("períodos regulares de descanso")));
  assert.ok(plan.medio.some((item) => item.includes("Apoio psicológico")));
  assert.deepEqual(plan.encaminhamentos, ["Psicologia", "Serviço social"]);
});

test("Charlson alto mantém coordenação de cuidado sem confundir escore com decisão", () => {
  const plan = interventionFor("charlson", "vermelho");
  assert.ok(plan.medio.some((item) => item.includes("metas de cuidado")));
  assert.deepEqual(plan.encaminhamentos, ["Coordenação de cuidado interdisciplinar"]);
});

test("VES-13 positivo direciona para avaliação geriátrica completa", () => {
  const plan = interventionFor("ves13", "vermelho");
  assert.ok(plan.agora[0]?.includes("avaliação geriátrica completa"));
  assert.deepEqual(plan.encaminhamentos, ["Geriatria / Oncogeriatria"]);
});

test("MNA-SF alterada preserva plano nutricional do legado", () => {
  const red = interventionFor("mna_sf", "vermelho");
  assert.ok(red.agora.some((item) => item.includes("porções menores distribuídas ao longo do dia")));
  assert.ok(red.encaminhamentos.includes("Nutrição"));
  assert.ok(red.encaminhamentos.includes("Fonoaudiologia"));

  const yellow = interventionFor("mna_sf", "amarelo");
  assert.ok(yellow.agora.some((item) => item.includes("acompanhe o peso periodicamente")));
  assert.deepEqual(yellow.encaminhamentos, ["Nutrição"]);
});

test("FAST vermelho mantém adaptação ambiental e cuidado interdisciplinar", () => {
  const plan = interventionFor("fast", "vermelho");
  assert.ok(plan.agora.some((item) => item.includes("ambiente")));
  assert.ok(plan.encaminhamentos.includes("Cuidados paliativos"));
});

test("ESAS vermelho prioriza sintomas e cuidados paliativos", () => {
  const plan = interventionFor("esas", "vermelho");
  assert.ok(plan.agora.some((item) => item.includes("sintomas")));
  assert.deepEqual(plan.encaminhamentos, ["Cuidados paliativos"]);
});
