import assert from "node:assert/strict";
import test from "node:test";
import {
  buildVaccinationPreventionSection,
  normalizeVaccinationReview,
} from "../../src/domain/vaccination-prevention.ts";

test("vacinas pendentes são reproduzidas sem criar prescrição automática", () => {
  const section = buildVaccinationPreventionSection({
    status: "PENDING",
    pendingVaccines: ["Influenza", "  Pneumocócica  ", "influenza"],
  });

  assert.equal(section.status, "PENDING");
  assert.deepEqual(section.pendingVaccines, ["Influenza", "Pneumocócica"]);
  assert.equal(section.automaticPrescription, false);
  assert.doesNotMatch(section.guidance.join(" "), /aplicar|administrar|prescrever|dose|esquema/i);
});

test("status desconhecido orienta revisão da carteira sem presumir pendências", () => {
  const section = buildVaccinationPreventionSection();

  assert.equal(section.status, "UNKNOWN");
  assert.deepEqual(section.pendingVaccines, []);
  assert.match(section.guidance.join(" "), /carteira de vacinação.*revisão/i);
  assert.match(section.guidance.join(" "), /nenhuma pendência foi presumida/i);
});

test("revisão vacinal rejeita status pendente sem nome e pendência incompatível", () => {
  assert.throws(
    () => normalizeVaccinationReview({ status: "PENDING", pendingVaccines: [] }),
    /ao menos uma vacina/,
  );
  assert.throws(
    () => normalizeVaccinationReview({ status: "UP_TO_DATE", pendingVaccines: ["Influenza"] }),
    /só podem ser registradas/,
  );
  assert.throws(
    () => normalizeVaccinationReview({ status: "PENDING", pendingVaccines: ["Aplicar influenza hoje"] }),
    /somente o nome da vacina/,
  );
});
