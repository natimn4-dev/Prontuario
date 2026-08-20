import assert from "node:assert/strict";
import test from "node:test";
import {
  filterFamilySafeCareItems,
  sanitizeFamilyNarrative,
} from "../../src/domain/family-care-safety.ts";

test("family report removes pharmacologic and supplement conduct", () => {
  const safe = filterFamilySafeCareItems([
    "Manter atividade física compatível com a capacidade funcional.",
    "Dosagem de vitamina D com reposição se deficiente.",
    "Considerar iniciar medicamento hipolipemiante.",
    "Reavaliar as doses conforme a função dos rins e do fígado.",
    "Não suspender medicamentos por conta própria; converse com a equipe assistencial.",
  ]);

  assert.deepEqual(safe, [
    "Manter atividade física compatível com a capacidade funcional.",
    "Não suspender medicamentos por conta própria; converse com a equipe assistencial.",
  ]);
});

test("family interpretation keeps meaning while removing medical workup sentences", () => {
  const text = sanitizeFamilyNarrative(
    "Rastreio sugere redução de força. Investigar causas secundárias e dosagem de vitamina D. Manter atividades seguras conforme tolerância.",
  );
  assert.match(text ?? "", /redução de força/i);
  assert.match(text ?? "", /atividades seguras/i);
  assert.doesNotMatch(text ?? "", /vitamina d|investigar causas/i);
});

test("family narrative falls back to a neutral explanation when every sentence is clinical conduct", () => {
  const text = sanitizeFamilyNarrative("Prescrever vitamina D. Reavaliar as doses do medicamento.");
  assert.match(text ?? "", /discutida com a equipe assistencial/i);
  assert.doesNotMatch(text ?? "", /vitamina d|dose do medicamento/i);
});
