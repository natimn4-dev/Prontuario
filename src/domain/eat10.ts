export const EAT10_CODE = "eat10" as const;
export const EAT10_VERSION = "eat10-br-goncalves-2013-v1" as const;

const SCORE_CHOICES = [
  { value: 0, label: "0 — não é um problema" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 4, label: "4 — é um problema muito grande" },
] as const;

export const EAT10_DEFINITION = {
  code: EAT10_CODE,
  version: EAT10_VERSION,
  name: "EAT-10 — rastreio de disfagia",
  dimension: "nutricao",
  instruction: "Para cada afirmação, marque de 0 (não é um problema) a 4 (é um problema muito grande). O total de 0 a 40 é calculado automaticamente.",
  applicationGuide: [
    {
      title: "Leitura clínica",
      items: [
        "0–2 pontos: rastreio negativo para risco de disfagia.",
        "3 pontos ou mais: rastreio positivo para risco de disfagia; encaminhar para avaliação clínica aprofundada, geralmente com fonoaudiólogo.",
        "O EAT-10 é instrumento de rastreio e não estabelece diagnóstico de disfagia ou aspiração isoladamente.",
      ],
    },
  ],
  sourceNote: "Eating Assessment Tool-10 (EAT-10): Belafsky et al., 2008, PMID 19140539. Adaptação transcultural brasileira: Gonçalves, Remaili e Behlau, 2013, PMID 24626972. A versão brasileira mantém 10 itens, pontuação 0–4 por item e corte ≥3 para risco de disfagia.",
  fields: [
    { id: "weight_loss", label: "1. Meu problema para engolir me faz perder peso.", choices: SCORE_CHOICES },
    { id: "eating_out", label: "2. Meu problema para engolir não me deixa comer fora de casa.", choices: SCORE_CHOICES },
    { id: "liquids", label: "3. Preciso fazer força para beber líquidos.", choices: SCORE_CHOICES },
    { id: "solids", label: "4. Preciso fazer força para engolir comida (sólidos).", choices: SCORE_CHOICES },
    { id: "pills", label: "5. Preciso fazer força para engolir remédios.", choices: SCORE_CHOICES },
    { id: "pain", label: "6. Dói para engolir.", choices: SCORE_CHOICES },
    { id: "pleasure", label: "7. Meu problema para engolir me tira o prazer de comer.", choices: SCORE_CHOICES },
    { id: "sticking", label: "8. Fico com comida presa/entalada na garganta.", choices: SCORE_CHOICES },
    { id: "cough", label: "9. Eu tusso quando como.", choices: SCORE_CHOICES },
    { id: "stress", label: "10. Engolir me deixa estressado.", choices: SCORE_CHOICES },
  ],
} as const;

function answer(raw: Record<string, unknown>, id: string): number {
  const value = raw[id];
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 4) {
    throw new Error(`EAT-10 inválido: ${id}.`);
  }
  return value;
}

export function scoreEat10(raw: Record<string, unknown>) {
  const allowed = new Set(EAT10_DEFINITION.fields.map((field) => field.id));
  if (Object.keys(raw).some((id) => !allowed.has(id))) throw new Error("EAT-10 contém campo não permitido.");

  const answers = Object.fromEntries(EAT10_DEFINITION.fields.map((field) => [field.id, answer(raw, field.id)]));
  const score = Object.values(answers).reduce((total, value) => total + value, 0);
  const positive = score >= 3;

  return {
    answers,
    result: {
      score,
      scoreText: `${score}/40`,
      classification: positive ? "Rastreio positivo para risco de disfagia" : "Rastreio negativo para risco de disfagia",
      interpretation: positive
        ? "EAT-10 ≥ 3: rastreio positivo para risco de disfagia. Recomenda-se avaliação clínica aprofundada da deglutição, geralmente com fonoaudiólogo. O resultado isolado não estabelece diagnóstico de disfagia nem de aspiração."
        : "EAT-10 de 0 a 2: rastreio negativo para risco de disfagia. Reavaliar se surgirem tosse ou engasgos nas refeições, sensação de alimento parado, perda de peso ou mudança persistente da ingestão.",
      clinicalColor: positive ? "vermelho" : "verde",
    },
    version: EAT10_VERSION,
  };
}
