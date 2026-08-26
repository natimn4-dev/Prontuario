import { scoreComplementaryScale } from "./complementary-score-scales.ts";

export const CORNELL_STRUCTURED_CODE = "cornell" as const;
export const CORNELL_STRUCTURED_VERSION = "cornell-19-items-2026-08-v1" as const;

const CHOICES = [
  { value: 0, label: "Ausente — 0" },
  { value: 1, label: "Leve ou intermitente — 1" },
  { value: 2, label: "Grave — 2" },
  { value: "NA", label: "Não foi possível avaliar" },
] as const;

const item = (id: string, label: string) => ({ id, label, choices: CHOICES });

export const CORNELL_ITEM_IDS = [
  "co1", "co2", "co3", "co4", "co5", "co6", "co7", "co8", "co9", "co10",
  "co11", "co12", "co13", "co14", "co15", "co16", "co17", "co18", "co19",
] as const;

export const CORNELL_STRUCTURED_DEFINITION = {
  code: CORNELL_STRUCTURED_CODE,
  version: CORNELL_STRUCTURED_VERSION,
  name: "Cornell — depressão na demência",
  dimension: "humor",
  instruction: "Entreviste o informante e o paciente separadamente, reconcilie as informações com a observação clínica e marque uma resposta em cada um dos 19 itens. O total é calculado automaticamente.",
  applicationGuide: [
    {
      title: "A — Sinais relacionados ao humor",
      items: ["Ansiedade, tristeza, falta de reação a eventos agradáveis e irritabilidade."],
    },
    {
      title: "B — Alterações comportamentais",
      items: ["Agitação, retardo, queixas físicas múltiplas e perda de interesse."],
    },
    {
      title: "C — Sinais físicos",
      items: ["Perda de apetite, perda de peso e falta de energia."],
    },
    {
      title: "D — Funções cíclicas",
      items: ["Variação diurna do humor, dificuldade para adormecer, múltiplos despertares e despertar matinal precoce."],
    },
    {
      title: "E — Alterações ideativas",
      items: ["Ideação suicida, baixa autoestima, pessimismo e delírios congruentes com o humor."],
    },
    {
      title: "Leitura usada no prontuário",
      items: ["0–7: sem indicação relevante no rastreio.", "8–11: sintomas depressivos prováveis.", "12–38: depressão maior provável; exige avaliação clínica, não diagnóstico automático.", "Se algum item não puder ser avaliado, o prontuário não calcula nem salva uma classificação potencialmente enganosa."],
    },
  ],
  sourceNote: "Cornell Scale for Depression in Dementia (Alexopoulos et al., 1988; PMID 3337862): instrumento clínico de 19 itens, aplicado com paciente e informante, total de 0 a 38. Resultado de rastreio; não estabelece diagnóstico isoladamente.",
  fields: [
    item("co1", "A1. Ansiedade — expressão ansiosa, ruminações ou preocupações"),
    item("co2", "A2. Tristeza — expressão triste, voz triste ou choro"),
    item("co3", "A3. Falta de reação a eventos agradáveis"),
    item("co4", "A4. Irritabilidade — facilmente incomodado ou temperamento explosivo"),
    item("co5", "B5. Agitação — inquietação, torcer as mãos ou puxar os cabelos"),
    item("co6", "B6. Retardo — movimentos, fala ou reações lentificados"),
    item("co7", "B7. Queixas físicas múltiplas"),
    item("co8", "B8. Perda de interesse — menor envolvimento nas atividades habituais"),
    item("co9", "C9. Perda de apetite — comer menos que o habitual"),
    item("co10", "C10. Perda de peso"),
    item("co11", "C11. Falta de energia — fadiga ou incapacidade de sustentar atividades"),
    item("co12", "D12. Variação diurna do humor — sintomas piores pela manhã"),
    item("co13", "D13. Dificuldade para adormecer — mais tarde que o habitual"),
    item("co14", "D14. Múltiplos despertares durante o sono"),
    item("co15", "D15. Despertar matinal precoce — antes do habitual"),
    item("co16", "E16. Ideação suicida — sente que a vida não vale a pena ou tem desejos suicidas"),
    item("co17", "E17. Baixa autoestima — autorreprovação ou sentimento de fracasso"),
    item("co18", "E18. Pessimismo — antecipação do pior"),
    item("co19", "E19. Delírios congruentes com o humor — pobreza, doença ou perda"),
  ],
} as const;

function answer(raw: Record<string, unknown>, id: string): number {
  const value = raw[id];
  if (value === "NA") throw new Error(`Cornell incompleta: ${id} não foi possível avaliar.`);
  if (typeof value !== "number" || ![0, 1, 2].includes(value)) throw new Error(`Cornell inválida: ${id}.`);
  return value;
}

export function scoreCornellStructured(raw: Record<string, unknown>) {
  const allowed = new Set<string>(CORNELL_ITEM_IDS);
  if (Object.keys(raw).some((key) => !allowed.has(key))) throw new Error("Cornell inválida: campo não permitido.");

  const answers = Object.fromEntries(CORNELL_ITEM_IDS.map((id) => [id, answer(raw, id)])) as Record<(typeof CORNELL_ITEM_IDS)[number], number>;
  const score = CORNELL_ITEM_IDS.reduce((total, id) => total + answers[id], 0);
  const legacy = scoreComplementaryScale("cornell", { score });
  return { answers, result: legacy.result, version: CORNELL_STRUCTURED_VERSION };
}
