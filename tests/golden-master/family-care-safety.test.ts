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
    "Manter losartana 50 mg pela manhã.",
    "Reduzir sertralina para 25 mg ao dia.",
    "Continuar a medicação atual até nova avaliação.",
    "Iniciar suplemento de cálcio conforme tolerância.",
    "Não suspender medicamentos por conta própria; converse com a equipe assistencial.",
  ]);

  assert.deepEqual(safe, [
    "Manter atividade física compatível com a capacidade funcional.",
    "Não suspender medicamentos por conta própria; converse com a equipe assistencial.",
  ]);
});

test("family safety keeps explicit no-self-medication guidance while blocking treatment changes", () => {
  const safe = filterFamilySafeCareItems([
    "Não iniciar suplemento por conta própria; converse com a equipe assistencial.",
    "Não manter medicamento sem orientação da equipe assistencial.",
    "Aumentar donepezila para 10 mg à noite.",
    "Ajustar a dose do medicamento conforme resposta clínica.",
  ]);

  assert.deepEqual(safe, [
    "Não iniciar suplemento por conta própria; converse com a equipe assistencial.",
    "Não manter medicamento sem orientação da equipe assistencial.",
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
  const text = sanitizeFamilyNarrative("Prescrever vitamina D. Reavaliar as doses do medicamento. Manter losartana 50 mg pela manhã.");
  assert.match(text ?? "", /discutida com a equipe assistencial/i);
  assert.doesNotMatch(text ?? "", /vitamina d|dose do medicamento|losartana/i);
});

test("family safety blocks automatic vaccine administration while keeping carteira review", () => {
  const safe = filterFamilySafeCareItems([
    "Aplicar vacina contra influenza hoje.",
    "Administrar vacina pneumocócica conforme esquema.",
    "Receber vacina contra herpes-zóster.",
    "Levar a carteira de vacinação para revisão com a equipe assistencial.",
  ]);

  assert.deepEqual(safe, [
    "Levar a carteira de vacinação para revisão com a equipe assistencial.",
  ]);
});
