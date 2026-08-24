import { scoreComplementaryScale } from "./complementary-score-scales.ts";

export const BARTHEL_STRUCTURED_CODE = "barthel" as const;
export const BARTHEL_STRUCTURED_VERSION = "barthel-items-2026-08-v1" as const;
export const FRAIL_BR_STRUCTURED_CODE = "frail_br" as const;
export const FRAIL_BR_STRUCTURED_VERSION = "frail-br-items-2026-08-v1" as const;
export const MNA_SF_STRUCTURED_CODE = "mna_sf" as const;
export const MNA_SF_STRUCTURED_VERSION = "mna-sf-items-2026-08-v1" as const;

const yesNoRiskField = (id: string, label: string) => ({
  id,
  label,
  display: "checkbox" as const,
  choices: [
    { value: 0, label: "Ausente — 0" },
    { value: 1, label: "Presente — 1" },
  ] as const,
});

export const BARTHEL_STRUCTURED_DEFINITION = {
  code: BARTHEL_STRUCTURED_CODE,
  version: BARTHEL_STRUCTURED_VERSION,
  name: "Índice de Barthel",
  dimension: "funcionalidade",
  instruction: "Selecione uma alternativa em cada atividade. O total de 0 a 100 é calculado automaticamente.",
  applicationGuide: [{
    title: "Preenchimento seguro",
    items: [
      "Considere o desempenho habitual observado no período definido pela consulta.",
      "Pontue a ajuda realmente necessária, inclusive supervisão quando indicada.",
      "Não estime item sem informação: confirme todos os dez itens antes de salvar.",
    ],
  }],
  sourceNote: "Índice de Barthel, dez atividades e total 0–100. As faixas interpretativas permanecem as do golden master clínico do aplicativo (Mahoney e Barthel, 1965).",
  fields: [
    { id: "feeding", label: "Alimentação", choices: [
      { value: 0, label: "Dependente — 0" },
      { value: 5, label: "Precisa de ajuda para cortar, espalhar ou preparar — 5" },
      { value: 10, label: "Independente — 10" },
    ] },
    { id: "bathing", label: "Banho", choices: [
      { value: 0, label: "Dependente — 0" },
      { value: 5, label: "Independente — 5" },
    ] },
    { id: "grooming", label: "Higiene pessoal", choices: [
      { value: 0, label: "Precisa de ajuda — 0" },
      { value: 5, label: "Independente para rosto, cabelo, dentes e barbear — 5" },
    ] },
    { id: "dressing", label: "Vestir-se", choices: [
      { value: 0, label: "Dependente — 0" },
      { value: 5, label: "Precisa de ajuda, mas realiza cerca de metade — 5" },
      { value: 10, label: "Independente, inclusive fechos — 10" },
    ] },
    { id: "bowels", label: "Controle intestinal", choices: [
      { value: 0, label: "Incontinente ou necessita enema — 0" },
      { value: 5, label: "Acidente ocasional — 5" },
      { value: 10, label: "Continente — 10" },
    ] },
    { id: "bladder", label: "Controle urinário", choices: [
      { value: 0, label: "Incontinente ou não maneja a sonda — 0" },
      { value: 5, label: "Acidente ocasional — 5" },
      { value: 10, label: "Continente ou maneja a sonda com independência — 10" },
    ] },
    { id: "toilet", label: "Uso do toalete", choices: [
      { value: 0, label: "Dependente — 0" },
      { value: 5, label: "Precisa de alguma ajuda — 5" },
      { value: 10, label: "Independente — 10" },
    ] },
    { id: "transfers", label: "Transferência cama–cadeira", choices: [
      { value: 0, label: "Incapaz; sem equilíbrio sentado — 0" },
      { value: 5, label: "Ajuda física importante de uma ou duas pessoas — 5" },
      { value: 10, label: "Ajuda física pequena ou supervisão — 10" },
      { value: 15, label: "Independente — 15" },
    ] },
    { id: "mobility", label: "Mobilidade em superfície plana", choices: [
      { value: 0, label: "Imóvel ou menos de 50 metros — 0" },
      { value: 5, label: "Independente em cadeira de rodas por mais de 50 metros — 5" },
      { value: 10, label: "Caminha com ajuda de uma pessoa por mais de 50 metros — 10" },
      { value: 15, label: "Independente por mais de 50 metros, com auxílio se habitual — 15" },
    ] },
    { id: "stairs", label: "Escadas", choices: [
      { value: 0, label: "Incapaz — 0" },
      { value: 5, label: "Precisa de ajuda física ou supervisão — 5" },
      { value: 10, label: "Independente — 10" },
    ] },
  ],
} as const;

export const FRAIL_BR_STRUCTURED_DEFINITION = {
  code: FRAIL_BR_STRUCTURED_CODE,
  version: FRAIL_BR_STRUCTURED_VERSION,
  name: "FRAIL-BR",
  dimension: "fragilidade",
  instruction: "Marque cada componente de risco presente. O total de 0 a 5 é calculado automaticamente.",
  applicationGuide: [{
    title: "Leitura usada no prontuário",
    items: ["0: robusto.", "1–2: pré-frágil.", "3–5: frágil."],
  }],
  sourceNote: "Versão brasileira da escala FRAIL; cinco componentes binários. Faixas 0 / 1–2 / 3–5 preservadas do golden master clínico.",
  fields: [
    yesNoRiskField("fatigue", "Fadiga — cansaço na maior parte ou todo o tempo nas últimas quatro semanas"),
    yesNoRiskField("resistance", "Resistência — dificuldade para subir dez degraus sem parar e sem ajuda"),
    yesNoRiskField("ambulation", "Deambulação — dificuldade para caminhar algumas centenas de metros sem ajuda"),
    yesNoRiskField("illnesses", "Doenças — cinco ou mais condições crônicas previstas na versão adotada"),
    yesNoRiskField("weight_loss", "Perda de peso — redução não intencional de pelo menos 5% no último ano"),
  ],
} as const;

export const MNA_SF_STRUCTURED_DEFINITION = {
  code: MNA_SF_STRUCTURED_CODE,
  version: MNA_SF_STRUCTURED_VERSION,
  name: "MNA-SF — Mini Avaliação Nutricional, forma reduzida",
  dimension: "nutricao",
  instruction: "Selecione uma alternativa em cada um dos seis componentes. No último item, use IMC ou a alternativa de circunferência da panturrilha da versão aplicada.",
  applicationGuide: [{
    title: "Leitura usada no prontuário",
    items: ["0–7: desnutrição.", "8–11: risco de desnutrição.", "12–14: estado nutricional normal."],
  }],
  sourceNote: "MNA-SF validada (PMID 19812868), total 0–14. A incorporação eletrônica deve respeitar a versão e as condições de uso/licenciamento adotadas pelo serviço.",
  fields: [
    { id: "intake", label: "Redução da ingestão alimentar nos últimos três meses", choices: [
      { value: 0, label: "Redução grave — 0" },
      { value: 1, label: "Redução moderada — 1" },
      { value: 2, label: "Sem redução — 2" },
    ] },
    { id: "weight_loss", label: "Perda de peso nos últimos três meses", choices: [
      { value: 0, label: "Maior que 3 kg — 0" },
      { value: 1, label: "Não sabe informar — 1" },
      { value: 2, label: "Entre 1 e 3 kg — 2" },
      { value: 3, label: "Sem perda de peso — 3" },
    ] },
    { id: "mobility", label: "Mobilidade", choices: [
      { value: 0, label: "Restrito ao leito ou cadeira — 0" },
      { value: 1, label: "Levanta-se, mas não sai de casa — 1" },
      { value: 2, label: "Sai de casa — 2" },
    ] },
    { id: "acute_stress", label: "Estresse psicológico ou doença aguda nos últimos três meses", choices: [
      { value: 0, label: "Sim — 0" },
      { value: 2, label: "Não — 2" },
    ] },
    { id: "neuropsychological", label: "Problemas neuropsicológicos", choices: [
      { value: 0, label: "Demência grave ou depressão grave — 0" },
      { value: 1, label: "Demência leve — 1" },
      { value: 2, label: "Sem problema neuropsicológico — 2" },
    ] },
    { id: "anthropometry", label: "Antropometria — escolha IMC ou panturrilha conforme a versão aplicada", choices: [
      { value: 0, label: "IMC menor que 19 kg/m² ou, na alternativa válida, panturrilha menor que 31 cm — 0" },
      { value: 1, label: "IMC de 19 a menor que 21 kg/m² — 1" },
      { value: 2, label: "IMC de 21 a menor que 23 kg/m² — 2" },
      { value: 3, label: "IMC igual ou maior que 23 kg/m² ou, na alternativa válida, panturrilha igual ou maior que 31 cm — 3" },
    ] },
  ],
} as const;

function exactNumber(raw: Record<string, unknown>, id: string, allowed: readonly number[]): number {
  const value = raw[id];
  if (typeof value !== "number" || !allowed.includes(value)) {
    throw new Error(`Resposta inválida para ${id}.`);
  }
  return value;
}

function scoreFromFields(
  raw: Record<string, unknown>,
  fields: readonly { id: string; choices: readonly { value: number }[] }[],
): { answers: Record<string, number>; score: number } {
  const allowedIds = new Set(fields.map((field) => field.id));
  if (Object.keys(raw).some((id) => !allowedIds.has(id))) throw new Error("Resposta contém campo não permitido.");
  const answers = Object.fromEntries(fields.map((field) => [
    field.id,
    exactNumber(raw, field.id, field.choices.map((choice) => choice.value)),
  ]));
  return { answers, score: Object.values(answers).reduce((total, value) => total + value, 0) };
}

export function scoreBarthelStructured(raw: Record<string, unknown>) {
  const scored = scoreFromFields(raw, BARTHEL_STRUCTURED_DEFINITION.fields);
  const legacy = scoreComplementaryScale(BARTHEL_STRUCTURED_CODE, { score: scored.score });
  return { answers: scored.answers, result: legacy.result, version: BARTHEL_STRUCTURED_VERSION };
}

export function scoreFrailBrStructured(raw: Record<string, unknown>) {
  const scored = scoreFromFields(raw, FRAIL_BR_STRUCTURED_DEFINITION.fields);
  const legacy = scoreComplementaryScale(FRAIL_BR_STRUCTURED_CODE, { score: scored.score });
  return { answers: scored.answers, result: legacy.result, version: FRAIL_BR_STRUCTURED_VERSION };
}

export function scoreMnaSfStructured(raw: Record<string, unknown>) {
  const scored = scoreFromFields(raw, MNA_SF_STRUCTURED_DEFINITION.fields);
  const legacy = scoreComplementaryScale(MNA_SF_STRUCTURED_CODE, { score: scored.score });
  return { answers: scored.answers, result: legacy.result, version: MNA_SF_STRUCTURED_VERSION };
}
