import assert from "node:assert/strict";
import test from "node:test";
import { gastrostomyFamilyGuidance } from "../../src/domain/family-contextual-care.ts";
import { intrinsicCapacityGuidanceForDomain } from "../../src/domain/intrinsic-capacity-guidance.ts";

const protocolLikePhrases = /já definid|já orientad|eventual restrição|quando clinicamente seguro|conforme tolerância|conforme o plano clínico/i;

test("orientações de vitalidade evitam ressalvas protocolares e usam linguagem dirigida à família", () => {
  const guidance = intrinsicCapacityGuidanceForDomain("vitalidade").actions.join(" ");

  assert.doesNotMatch(guidance, protocolLikePhrases);
  assert.match(guidance, /refeições mais agradáveis e menos cansativas/i);
  assert.match(guidance, /ofereça líquidos várias vezes ao longo do dia/i);
  assert.match(guidance, /se foi combinado um limite diário de líquidos/i);
});

test("orientações de gastrostomia preservam segurança sem linguagem burocrática", () => {
  const guidance = gastrostomyFamilyGuidance();
  const text = [...guidance.now, ...guidance.caregiver, ...guidance.contact].join(" ");

  assert.doesNotMatch(text, protocolLikePhrases);
  assert.match(text, /volume prescrito/i);
  assert.match(text, /se algo estiver difícil ou precisar mudar, converse com a equipe/i);
});
