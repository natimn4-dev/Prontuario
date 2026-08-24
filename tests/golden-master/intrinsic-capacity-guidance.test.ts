import assert from "node:assert/strict";
import test from "node:test";
import { buildIntrinsicCapacityGuidance } from "../../src/domain/intrinsic-capacity-guidance.ts";

test("gera orientações somente para domínios alterados e avaliados na consulta alvo", () => {
  const guidance = buildIntrinsicCapacityGuidance([
    { scaleId: "sarcf", scaleName: "SARC-F", color: "vermelho", assessedInTargetConsultation: true },
    { scaleId: "mna_sf", scaleName: "MNA-SF", color: "amarelo", assessedInTargetConsultation: true },
    { scaleId: "cornell", scaleName: "Cornell", color: "verde", assessedInTargetConsultation: true },
    { scaleId: "dez_cs", scaleName: "10-CS", color: "vermelho", assessedInTargetConsultation: false },
  ]);

  assert.deepEqual(guidance.alteredDomains.map((domain) => domain.code), ["locomocao", "vitalidade"]);
  assert.deepEqual(guidance.alteredDomains[0]?.triggeredBy, ["SARC-F"]);
  assert.deepEqual(guidance.alteredDomains[1]?.triggeredBy, ["MNA-SF"]);
  assert.ok(guidance.alteredDomains.every((domain) => domain.actions.length >= 4));
  assert.ok(guidance.alteredDomains.every((domain) => domain.attentionSigns.length >= 2));
  assert.ok(guidance.alteredDomains.every((domain) => domain.evidenceReferences.length >= 1));
  assert.ok(guidance.alteredDomains.every((domain) => domain.evidenceReferences.every((reference) => /^\d+$/.test(reference.pmid))));
  assert.ok(guidance.alteredDomains.every((domain) => domain.evidenceReferences.every((reference) => reference.url === `https://pubmed.ncbi.nlm.nih.gov/${reference.pmid}/`)));
});

test("MNA-SF é indicador proxy de vitalidade e FRAIL-BR permanece contextual", () => {
  const guidance = buildIntrinsicCapacityGuidance([
    { scaleId: "mna_sf", scaleName: "MNA-SF", color: "vermelho", assessedInTargetConsultation: true },
    { scaleId: "frail_br", scaleName: "FRAIL-BR", color: "amarelo", assessedInTargetConsultation: true },
  ]);

  const vitality = guidance.alteredDomains.find((domain) => domain.code === "vitalidade");
  assert.ok(vitality);
  assert.deepEqual(vitality.triggeredBy, ["MNA-SF"]);
  assert.ok(!guidance.alteredDomains.some((domain) => domain.triggeredBy.includes("FRAIL-BR")));
  assert.match(vitality.whyItMatters, /indicador/i);
});

test("FRAIL-BR isolado não define automaticamente locomoção ou vitalidade", () => {
  const guidance = buildIntrinsicCapacityGuidance([
    { scaleId: "frail_br", scaleName: "FRAIL-BR", color: "vermelho", assessedInTargetConsultation: true },
  ]);

  assert.deepEqual(guidance.alteredDomains, []);
});

test("FAST, CAM e ISI permanecem contextuais e não acionam domínios de capacidade intrínseca", () => {
  const guidance = buildIntrinsicCapacityGuidance([
    { scaleId: "fast", scaleName: "FAST", color: "vermelho", assessedInTargetConsultation: true },
    { scaleId: "cam", scaleName: "CAM", color: "vermelho", assessedInTargetConsultation: true },
    { scaleId: "isi", scaleName: "ISI", color: "vermelho", assessedInTargetConsultation: true },
  ]);

  assert.deepEqual(guidance.alteredDomains, []);
});

test("VES-13, G8, KPS, PPS e ESAS não acionam vitalidade automaticamente", () => {
  const guidance = buildIntrinsicCapacityGuidance([
    { scaleId: "ves13", scaleName: "VES-13", color: "vermelho", assessedInTargetConsultation: true },
    { scaleId: "g8", scaleName: "G8", color: "vermelho", assessedInTargetConsultation: true },
    { scaleId: "kps", scaleName: "KPS", color: "vermelho", assessedInTargetConsultation: true },
    { scaleId: "pps", scaleName: "PPS", color: "vermelho", assessedInTargetConsultation: true },
    { scaleId: "esas", scaleName: "ESAS", color: "vermelho", assessedInTargetConsultation: true },
  ]);

  assert.deepEqual(guidance.alteredDomains, []);
});

test("não inventa alteração quando a avaliação está preservada ou ausente", () => {
  const guidance = buildIntrinsicCapacityGuidance([
    { scaleId: "fast", scaleName: "FAST", color: "verde", assessedInTargetConsultation: true },
  ]);

  assert.deepEqual(guidance.alteredDomains, []);
});
