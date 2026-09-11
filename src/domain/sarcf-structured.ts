import { scoreComplementaryScale } from "./complementary-score-scales.ts";

export const SARCF_STRUCTURED_CODE = "sarcf" as const;
export const SARCF_STRUCTURED_VERSION = "sarcf-structured-2026-08-v1" as const;
export const SARC_CALF_STRUCTURED_CODE = "sarc_calf" as const;
export const SARC_CALF_STRUCTURED_VERSION = "sarc-calf-br-barbosa-silva-2016-v1" as const;

const DIFFICULTY_CHOICES = [
  { value: 0, label: "Nenhuma dificuldade — 0" },
  { value: 1, label: "Alguma dificuldade — 1" },
  { value: 2, label: "Muita dificuldade ou incapaz — 2" },
] as const;

export const SARCF_STRUCTURED_DEFINITION = {
  code: SARCF_STRUCTURED_CODE,
  version: SARCF_STRUCTURED_VERSION,
  name: "SARC-F",
  dimension: "mobilidade",
  instruction: "Marque uma resposta em cada um dos cinco itens. O escore total é calculado automaticamente.",
  applicationGuide: [
    {
      title: "Leitura clínica",
      items: [
        "0–3: rastreio negativo.",
        "4–10: rastreio positivo para risco de sarcopenia; confirmar em avaliação clínica.",
      ],
    },
  ],
  sourceNote: "SARC-F: cinco domínios, total 0–10. Corte de rastreio ≥4 preservado do golden master; não confirma sarcopenia isoladamente.",
  fields: [
    { id: "strength", label: "Força — dificuldade para levantar e carregar cerca de 4,5 kg", choices: DIFFICULTY_CHOICES },
    { id: "walking", label: "Assistência para caminhar — dificuldade para atravessar um cômodo", choices: DIFFICULTY_CHOICES },
    { id: "chair", label: "Levantar da cadeira — dificuldade para levantar-se de cadeira ou cama", choices: DIFFICULTY_CHOICES },
    { id: "stairs", label: "Subir escadas — dificuldade para subir 10 degraus", choices: DIFFICULTY_CHOICES },
    { id: "falls", label: "Quedas no último ano", choices: [
      { value: 0, label: "Nenhuma — 0" },
      { value: 1, label: "1 a 3 quedas — 1" },
      { value: 2, label: "4 ou mais quedas — 2" },
    ] },
  ],
} as const;

export const SARC_CALF_STRUCTURED_DEFINITION = {
  code: SARC_CALF_STRUCTURED_CODE,
  version: SARC_CALF_STRUCTURED_VERSION,
  name: "SARC-CalF — rastreio de sarcopenia",
  dimension: "nutricao",
  instruction: "Responda aos cinco itens do SARC-F e informe sexo e circunferência da panturrilha. O sistema soma 10 pontos quando a panturrilha está no ponto de alerta validado e calcula o total de 0 a 20.",
  applicationGuide: [
    {
      title: "Componente SARC-F",
      items: [
        "Força: dificuldade para carregar cerca de 5 kg — 0 nenhuma, 1 alguma, 2 muita/incapaz.",
        "Caminhar: dificuldade para atravessar um cômodo — 0 nenhuma, 1 alguma, 2 muita/usa ajuda/incapaz.",
        "Levantar: dificuldade para levantar-se de cadeira ou cama — 0 nenhuma, 1 alguma, 2 muita/usa ajuda/incapaz.",
        "Escadas: dificuldade para subir 10 degraus — 0 nenhuma, 1 alguma, 2 muita/incapaz.",
        "Quedas no último ano — 0 nenhuma, 1 uma a três, 2 quatro ou mais.",
      ],
    },
    {
      title: "Componente CalF — circunferência da panturrilha",
      items: [
        "Masculino: circunferência da panturrilha ≤ 34 cm acrescenta 10 pontos.",
        "Feminino: circunferência da panturrilha ≤ 33 cm acrescenta 10 pontos.",
        "Panturrilha acima do ponto de alerta acrescenta 0 ponto.",
        "Total SARC-CalF: 0–20; escore ≥ 11 indica rastreio positivo e não confirma sarcopenia isoladamente.",
      ],
    },
  ],
  sourceNote: "SARC-CalF validado em idosos brasileiros por Barbosa-Silva TG et al., J Am Med Dir Assoc. 2016; PMID 27650212. O algoritmo combina SARC-F (0–10) com 10 pontos para baixa circunferência da panturrilha; ≥11 é rastreio positivo.",
  fields: [
    { id: "strength", label: "Força — dificuldade para carregar cerca de 5 kg", choices: DIFFICULTY_CHOICES },
    { id: "walking", label: "Caminhar — dificuldade para atravessar um cômodo", choices: DIFFICULTY_CHOICES },
    { id: "chair", label: "Levantar — dificuldade para levantar-se de cadeira ou cama", choices: DIFFICULTY_CHOICES },
    { id: "stairs", label: "Escadas — dificuldade para subir 10 degraus", choices: DIFFICULTY_CHOICES },
    { id: "falls", label: "Quedas no último ano", choices: [
      { value: 0, label: "Nenhuma — 0" },
      { value: 1, label: "1 a 3 quedas — 1" },
      { value: 2, label: "4 ou mais quedas — 2" },
    ] },
    { id: "sex", label: "Sexo para aplicação do ponto de corte da panturrilha", choices: [
      { value: "Masculino", label: "Masculino — alerta se panturrilha ≤ 34 cm" },
      { value: "Feminino", label: "Feminino — alerta se panturrilha ≤ 33 cm" },
    ] },
    { id: "calfCm", label: "Circunferência da panturrilha", number: {
      min: 1,
      max: 100,
      step: 0.1,
      unit: "cm",
      help: "Meça em centímetros. O sistema aplica automaticamente o ponto de alerta conforme o sexo informado.",
    } },
  ],
} as const;

function answer(raw: Record<string, unknown>, id: string): number {
  const value = raw[id];
  if (typeof value !== "number" || ![0, 1, 2].includes(value)) throw new Error(`SARC-F inválido: ${id}.`);
  return value;
}

function sarcAnswers(raw: Record<string, unknown>) {
  return {
    strength: answer(raw, "strength"),
    walking: answer(raw, "walking"),
    chair: answer(raw, "chair"),
    stairs: answer(raw, "stairs"),
    falls: answer(raw, "falls"),
  };
}

export function scoreSarcfStructured(raw: Record<string, unknown>) {
  const answers = sarcAnswers(raw);
  const score = answers.strength + answers.walking + answers.chair + answers.stairs + answers.falls;
  const legacy = scoreComplementaryScale("sarcf", { score });
  return { answers, result: legacy.result, version: SARCF_STRUCTURED_VERSION };
}

export function scoreSarcCalfStructured(raw: Record<string, unknown>) {
  const allowed = new Set<string>(SARC_CALF_STRUCTURED_DEFINITION.fields.map((field) => field.id));
  if (Object.keys(raw).some((id) => !allowed.has(id))) throw new Error("SARC-CalF contém campo não permitido.");

  const sarc = sarcAnswers(raw);
  const sex = raw.sex;
  if (sex !== "Masculino" && sex !== "Feminino") throw new Error("SARC-CalF inválido: sex.");
  const calfCm = raw.calfCm;
  if (typeof calfCm !== "number" || !Number.isFinite(calfCm) || calfCm <= 0 || calfCm > 100) throw new Error("SARC-CalF inválido: calfCm.");

  const sarcFScore = sarc.strength + sarc.walking + sarc.chair + sarc.stairs + sarc.falls;
  const lowCalf = sex === "Masculino" ? calfCm <= 34 : calfCm <= 33;
  const score = sarcFScore + (lowCalf ? 10 : 0);
  const positive = score >= 11;

  return {
    answers: { ...sarc, sex, calfCm },
    result: {
      score,
      scoreText: `${score}/20`,
      classification: positive ? "Rastreio positivo para sarcopenia" : "Rastreio negativo para sarcopenia",
      interpretation: positive
        ? "SARC-CalF ≥ 11: rastreio positivo. O resultado deve motivar avaliação clínica de sarcopenia e não estabelece diagnóstico isoladamente."
        : "SARC-CalF < 11: rastreio não positivo. Reavaliar conforme evolução clínica, perda funcional, nutricional ou de força.",
      clinicalColor: positive ? "vermelho" : "verde",
    },
    version: SARC_CALF_STRUCTURED_VERSION,
  };
}
