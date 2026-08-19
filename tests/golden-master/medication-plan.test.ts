import assert from "node:assert/strict";
import test from "node:test";
import {
  assertMedicationTextContainsNoSchedule,
  buildMedicationPlanRows,
  renderMedicationPlanText,
  validateMedicationPlan,
} from "../../src/domain/medication-plan.ts";

const items = [
  { id: "1", medicationText: "Losartana 50 mg", doseInstruction: "1 comprimido", route: "VO", moments: ["manha", "noite"] as const, continuous: true },
  { id: "2", medicationText: "Aripiprazol 1 mg/mL", doseInstruction: "1 mL", route: "VO", moments: ["manha"] as const, instructions: "Aumentar conforme plano médico." },
  { id: "3", medicationText: "Risperidona 1 mg", doseInstruction: "1 comprimido", route: "VO", moments: ["se_necessario"] as const },
];

test("um medicamento suporta múltiplos horários sem duplicar sua linha", () => {
  const text = renderMedicationPlanText("Paciente Teste", items);
  assert.equal(text.match(/Losartana 50 mg/g)?.length, 1);
  assert.match(text, /\[x\] Manhã/);
  assert.match(text, /\[x\] Noite/);
});

test("modelo estruturado mantém uma linha por medicamento e horários independentes", () => {
  const rows = buildMedicationPlanRows(items);

  assert.equal(rows.length, 3);
  assert.equal(rows[0]?.medicationText, "Losartana 50 mg");
  assert.equal(rows[0]?.doseInstruction, "1 comprimido");
  assert.equal(rows[0]?.route, "VO");
  assert.equal(rows[0]?.continuous, true);
  assert.equal(rows[0]?.moments.manha, true);
  assert.equal(rows[0]?.moments.noite, true);
  assert.equal(rows[0]?.moments.almoco, false);
  assert.equal(rows[2]?.moments.se_necessario, true);
});

test("plano textual preserva instruções, via, dose e uso contínuo", () => {
  const text = renderMedicationPlanText("Paciente Teste", items);
  assert.match(text, /ARIPIPRAZOL/i);
  assert.match(text, /Aumentar conforme plano médico/);
  assert.match(text, /uso contínuo/);
});

test("plano rejeita id duplicado", () => {
  assert.throws(() => validateMedicationPlan([items[0]!, items[0]!]), /duplicado/);
});

test("texto rejeita frequência e horário em variantes usuais", () => {
  for (const value of [
    "Losartana 50 mg 2x/dia",
    "Losartana 50 mg 2 vezes ao dia",
    "Losartana 50 mg manhã e noite",
    "Losartana 50 mg MANHÃ/NOITE",
    "Losartana 50 mg manhã + noite",
  ]) {
    assert.throws(() => assertMedicationTextContainsNoSchedule(value), /horários nos campos estruturados/);
  }
});

test("limpeza preserva conteúdo clínico e remove apenas espaços redundantes", () => {
  const [item] = validateMedicationPlan([{ ...items[0]!, medicationText: "  Losartana   50 mg  " }]);
  assert.equal(item?.medicationText, "Losartana 50 mg");
});
