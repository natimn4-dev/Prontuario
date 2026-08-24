import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { buildFamilyReportSafetyGuidance } from "../../src/domain/family-report-safety.ts";

test("bloco fixo de ajuda imediata cobre deterioração aguda sem depender de escala aplicada", () => {
  const guidance = buildFamilyReportSafetyGuidance();
  assert.equal(guidance.version, "family-safety-2026-08-v1");
  assert.ok(guidance.urgent.length >= 7);
  assert.match(guidance.urgent.join(" "), /fraqueza|fala alterada/i);
  assert.match(guidance.urgent.join(" "), /dor forte no peito|falta de ar intensa/i);
  assert.match(guidance.urgent.join(" "), /confusão de início súbito/i);
  assert.match(guidance.urgent.join(" "), /queda com impacto na cabeça/i);
  assert.match(guidance.urgent.join(" "), /engasgo/i);
  assert.ok(guidance.evidenceReferences.some((item) => item.pmid === "36178003"));
});

test("relatório visual usa o bloco fixo e remove a duplicação por capacidade intrínseca", () => {
  const report = readFileSync("src/components/reports/aga-report-document-preview.tsx", "utf8");
  assert.match(report, /report\.safetyGuidance\.urgent/);
  assert.match(report, /report\.safetyGuidance\.contact/);
  assert.doesNotMatch(report, /Orientações por domínio de capacidade intrínseca/);
  assert.doesNotMatch(report, /Sem orientação registrada/);
  assert.doesNotMatch(report, /Orientação individual deste domínio deve ser concluída/);
  assert.doesNotMatch(report, /Não avaliado nesta consulta/);
  assert.doesNotMatch(report, /Nenhum alerta prioritário registrado nesta consulta/);
});
