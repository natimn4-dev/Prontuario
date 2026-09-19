import assert from "node:assert/strict";
import test from "node:test";
import { NPI_STRUCTURED_DEFINITION, scoreNpiStructured } from "../../src/domain/npi-structured.ts";

function emptyAnswers() {
  return Object.fromEntries(NPI_STRUCTURED_DEFINITION.fields.map((field) => [field.id, 0]));
}

test("NPI sem sintomas permanece preservado", () => {
  const scored = scoreNpiStructured(emptyAnswers());
  assert.equal(scored.result.score, 0);
  assert.equal(scored.result.clinicalColor, "verde");
  assert.match(scored.result.classification, /Sem sintomas neuropsiquiátricos/i);
});

test("NPI calcula frequência x gravidade e identifica domínios positivos", () => {
  const answers = emptyAnswers();
  answers.npi_agitation_frequency = 3;
  answers.npi_agitation_severity = 2;
  answers.npi_anxiety_frequency = 2;
  answers.npi_anxiety_severity = 1;

  const scored = scoreNpiStructured(answers);
  assert.equal(scored.result.score, 8);
  assert.equal(scored.result.clinicalColor, "amarelo");
  assert.match(scored.result.classification, /2 domínio\(s\)/i);
  assert.match(scored.result.interpretation, /Agitação \/ agressividade/i);
  assert.match(scored.result.interpretation, /Ansiedade/i);
});

test("NPI rejeita frequência e gravidade discordantes", () => {
  const frequencyOnly = emptyAnswers();
  frequencyOnly.npi_agitation_frequency = 2;
  assert.throws(() => scoreNpiStructured(frequencyOnly), /frequência e gravidade/i);

  const severityOnly = emptyAnswers();
  severityOnly.npi_agitation_severity = 2;
  assert.throws(() => scoreNpiStructured(severityOnly), /frequência e gravidade/i);
});

test("NPI rejeita campos externos", () => {
  assert.throws(
    () => scoreNpiStructured({ ...emptyAnswers(), unexpected: 1 }),
    /campo não permitido/i,
  );
});
