import assert from "node:assert/strict";
import test from "node:test";
import {
  MEDICATION_STATUS_LABELS,
  buildMedicationStatusControlItems,
} from "../../src/domain/medication-status-presentation.ts";

test("apresentação de status preserva estado atual e oferece apenas mudanças explícitas", () => {
  const [item] = buildMedicationStatusControlItems([
    {
      id: "med-1",
      name: "Losartana",
      presentation: "50 mg",
      status: "ACTIVE",
    },
  ]);

  assert.equal(item.displayName, "Losartana — 50 mg");
  assert.equal(item.currentStatus, "ACTIVE");
  assert.equal(item.currentStatusLabel, "Em uso");
  assert.deepEqual(item.availableStatuses, [
    { value: "SUSPENDED", label: "Suspenso" },
    { value: "FINISHED", label: "Finalizado" },
  ]);
});

test("rótulos são puramente de apresentação e cobrem todos os status persistidos", () => {
  assert.deepEqual(MEDICATION_STATUS_LABELS, {
    ACTIVE: "Em uso",
    SUSPENDED: "Suspenso",
    FINISHED: "Finalizado",
  });
});

test("apresentação falha fechado para medicamento sem identidade válida", () => {
  assert.throws(
    () => buildMedicationStatusControlItems([
      { id: "med-1", name: "   ", status: "ACTIVE" },
    ]),
    /sem identificação válida/,
  );
  assert.throws(
    () => buildMedicationStatusControlItems([
      { id: "med-1", name: "Medicamento\nforjado", status: "ACTIVE" },
    ]),
    /sem identificação válida/,
  );
});

test("apresentação rejeita identificadores duplicados para não misturar ações", () => {
  assert.throws(
    () => buildMedicationStatusControlItems([
      { id: "med-1", name: "Medicamento A", status: "ACTIVE" },
      { id: "med-1", name: "Medicamento B", status: "SUSPENDED" },
    ]),
    /identificador inválido ou duplicado/,
  );
});
