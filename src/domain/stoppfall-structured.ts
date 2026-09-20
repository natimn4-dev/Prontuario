import { scoreComplementaryScale } from "./complementary-score-scales.ts";

export const STOPPFALL_STRUCTURED_CODE = "stoppfall" as const;
export const STOPPFALL_STRUCTURED_VERSION = "stoppfall-classes-2026-08-v1" as const;

const CLASS_CHOICES = [
  { value: 0, label: "Ausente" },
  { value: 1, label: "Presente" },
] as const;

const classField = (id: string, label: string) => ({
  id,
  label,
  display: "checkbox" as const,
  choices: CLASS_CHOICES,
});

export const STOPPFALL_STRUCTURED_DEFINITION = {
  code: STOPPFALL_STRUCTURED_CODE,
  version: STOPPFALL_STRUCTURED_VERSION,
  name: "STOPPFall — classes de risco de queda",
  dimension: "medicamentos",
  instruction: "Marque as classes STOPPFall presentes na lista de medicamentos reconciliada. Conte classes, não comprimidos ou princípios ativos da mesma classe.",
  applicationGuide: [
    {
      title: "Como interpretar",
      items: [
        "0: nenhuma classe identificada.",
        "1–2: faixa local de atenção do prontuário.",
        "3–14: faixa local de maior prioridade para revisão medicamentosa.",
        "A presença de uma classe não determina retirada automática: revisar indicação, sintomas, quedas e risco de retirada com a equipe.",
      ],
    },
  ],
  sourceNote: "As 14 classes são baseadas no consenso STOPPFall (PMID 33349863). As faixas 0 / 1–2 / 3–14 são uma regra local histórica de priorização do prontuário e não um ponto de corte de risco validado pelo consenso.",
  fields: [
    classField("anticholinergics", "Anticolinérgicos"),
    classField("diuretics", "Diuréticos"),
    classField("alpha_blockers_antihypertensive", "Alfa-bloqueadores usados como anti-hipertensivos"),
    classField("opioids", "Opioides"),
    classField("antidepressants", "Antidepressivos"),
    classField("antipsychotics", "Antipsicóticos"),
    classField("antiepileptics", "Antiepilépticos"),
    classField("benzodiazepines", "Benzodiazepínicos"),
    classField("benzodiazepine_related", "Fármacos relacionados aos benzodiazepínicos"),
    classField("central_antihypertensives", "Anti-hipertensivos de ação central"),
    classField("alpha_blockers_bph", "Alfa-bloqueadores para hiperplasia prostática"),
    classField("antihistamines", "Anti-histamínicos"),
    classField("cardiac_vasodilators", "Vasodilatadores usados em doenças cardíacas"),
    classField("overactive_bladder", "Fármacos para bexiga hiperativa ou incontinência de urgência"),
  ],
} as const;

function checked(raw: Record<string, unknown>, id: string): number {
  const value = raw[id];
  if (value !== 0 && value !== 1) throw new Error(`STOPPFall inválido: ${id}.`);
  return value;
}

export function scoreStoppfallStructured(raw: Record<string, unknown>) {
  const answers = Object.fromEntries(
    STOPPFALL_STRUCTURED_DEFINITION.fields.map((field) => [field.id, checked(raw, field.id)]),
  ) as Record<string, number>;
  const score = Object.values(answers).reduce((total, value) => total + value, 0);
  const legacy = scoreComplementaryScale("stoppfall", { score });
  return {
    answers,
    result: legacy.result,
    version: STOPPFALL_STRUCTURED_VERSION,
  };
}
