export const COGNITIVE_DOMAIN_OBSERVATION_CODE = "cognitive_domain_observation" as const;
export const COGNITIVE_DOMAIN_OBSERVATION_VERSION = "clinical-cognitive-domain-observation-2026-09-v2" as const;

export type CognitiveDomainObservationInstrument = "meem" | "moca" | "clinical_observation";

export type CognitiveDomainObservationStatus = "not_assessed" | "no_change_observed" | "change_observed";

const STATUS_CHOICES = [
  { value: "not_assessed", label: "Não avaliado nesta consulta" },
  { value: "no_change_observed", label: "Sem alteração observada" },
  { value: "change_observed", label: "Alteração observada" },
] as const;

const INSTRUMENT_CHOICES = [
  { value: "meem", label: "MEEM" },
  { value: "moca", label: "MoCA" },
  { value: "clinical_observation", label: "Observação cognitiva integrada (sem escore)" },
] as const;

const INSTRUMENT_LABELS: Record<CognitiveDomainObservationInstrument, string> = {
  meem: "MEEM",
  moca: "MoCA",
  clinical_observation: "Observação cognitiva integrada",
};

export const COGNITIVE_DOMAIN_OBSERVATION_INSTRUMENT_FIELD = {
  id: "instrument",
  label: "Instrumento ou fonte do registro",
  choices: INSTRUMENT_CHOICES,
} as const;

export const COGNITIVE_DOMAIN_OBSERVATION_SCORE_FIELD = {
  id: "score",
  label: "Escore total informado (opcional)",
  optional: true,
  instrument: "clinical_observation",
  number: { min: 0, max: 30, step: 1, unit: "/30", help: "Informe apenas o total já obtido por meio autorizado; este registro não calcula itens ou subescores." },
} as const;

const MEEM_SUBTOTAL_FIELDS = [
  { id: "meem_orientation_temporal", label: "MEEM — orientação temporal", instrument: "meem", optional: true, number: { min: 0, max: 5, step: 1 } },
  { id: "meem_orientation_spatial", label: "MEEM — orientação espacial", instrument: "meem", optional: true, number: { min: 0, max: 5, step: 1 } },
  { id: "meem_registration", label: "MEEM — registro imediato", instrument: "meem", optional: true, number: { min: 0, max: 3, step: 1 } },
  { id: "meem_attention", label: "MEEM — atenção", instrument: "meem", optional: true, number: { min: 0, max: 5, step: 1 } },
  { id: "meem_recall", label: "MEEM — evocação", instrument: "meem", optional: true, number: { min: 0, max: 3, step: 1 } },
  { id: "meem_naming", label: "MEEM — nomeação", instrument: "meem", optional: true, number: { min: 0, max: 2, step: 1 } },
  { id: "meem_repetition", label: "MEEM — repetição", instrument: "meem", optional: true, number: { min: 0, max: 1, step: 1 } },
  { id: "meem_writing", label: "MEEM — escrita", instrument: "meem", optional: true, number: { min: 0, max: 1, step: 1 } },
  { id: "meem_commands", label: "MEEM — comandos", instrument: "meem", optional: true, number: { min: 0, max: 3, step: 1 } },
  { id: "meem_reading", label: "MEEM — leitura e execução", instrument: "meem", optional: true, number: { min: 0, max: 1, step: 1 } },
  { id: "meem_diagram_copy", label: "MEEM — cópia de diagrama", instrument: "meem", optional: true, number: { min: 0, max: 1, step: 1 } },
  { id: "meem_education", label: "MEEM — escolaridade para interpretação", instrument: "meem", optional: true, choices: [
    { value: 0, label: "Analfabeto / sem escolaridade formal" }, { value: 1, label: "1 a 4 anos" }, { value: 5, label: "5 a 8 anos" }, { value: 9, label: "9 a 11 anos" }, { value: 12, label: "12 anos ou mais" },
  ] },
] as const;

const MOCA_SUBTOTAL_FIELDS = [
  { id: "moca_visuospatial", label: "MoCA — visuoespacial / executiva", instrument: "moca", optional: true, number: { min: 0, max: 5, step: 1 } },
  { id: "moca_naming", label: "MoCA — nomeação", instrument: "moca", optional: true, number: { min: 0, max: 3, step: 1 } },
  { id: "moca_attention", label: "MoCA — atenção", instrument: "moca", optional: true, number: { min: 0, max: 6, step: 1 } },
  { id: "moca_language", label: "MoCA — linguagem", instrument: "moca", optional: true, number: { min: 0, max: 3, step: 1 } },
  { id: "moca_abstraction", label: "MoCA — abstração", instrument: "moca", optional: true, number: { min: 0, max: 2, step: 1 } },
  { id: "moca_delayed_recall", label: "MoCA — evocação tardia", instrument: "moca", optional: true, number: { min: 0, max: 5, step: 1 } },
  { id: "moca_orientation", label: "MoCA — orientação", instrument: "moca", optional: true, number: { min: 0, max: 6, step: 1 } },
  { id: "moca_education_years", label: "MoCA — anos completos de escolaridade", instrument: "moca", optional: true, number: { min: 0, max: 40, step: 1, help: "Usado somente para a correção educacional de +1 ponto quando ≤12 anos, limitada a 30." } },
] as const;

export const COGNITIVE_DOMAIN_OBSERVATION_SUBTOTAL_FIELDS = [...MEEM_SUBTOTAL_FIELDS, ...MOCA_SUBTOTAL_FIELDS] as const;

export const COGNITIVE_DOMAIN_OBSERVATION_FIELDS = [
  { id: "orientation", label: "Orientação", cognitiveDomainKey: "orientation_global" },
  { id: "immediate_memory", label: "Memória imediata / aprendizagem", cognitiveDomainKey: "immediate_memory" },
  { id: "delayed_recall", label: "Memória recente / evocação tardia", cognitiveDomainKey: "delayed_recall" },
  { id: "attention_working_memory", label: "Atenção / memória operacional", cognitiveDomainKey: "attention_working_memory" },
  { id: "executive_visuospatial", label: "Função executiva / visuoespacial", cognitiveDomainKey: "executive_visuospatial" },
  { id: "naming", label: "Nomeação", cognitiveDomainKey: "naming" },
  { id: "language", label: "Linguagem", cognitiveDomainKey: "language" },
  { id: "comprehension_commands", label: "Compreensão / execução de comandos", cognitiveDomainKey: "comprehension_commands" },
  { id: "abstraction", label: "Abstração / conceituação", cognitiveDomainKey: "abstraction" },
] as const;

export const COGNITIVE_DOMAIN_OBSERVATION_DEFINITION = {
  code: COGNITIVE_DOMAIN_OBSERVATION_CODE,
  version: COGNITIVE_DOMAIN_OBSERVATION_VERSION,
  name: "MEEM/MoCA — preenchimento por domínios",
  dimension: "cognicao" as const,
  instruction: "Selecione se o registro se refere ao MEEM, ao MoCA ou à observação integrada. Para MEEM/MoCA, informe os subtotais por domínio após aplicar o instrumento pelo meio autorizado; o servidor soma o total e aplica a correção educacional do MoCA. Esta tela não reproduz itens nem estabelece diagnóstico.",
  sourceNote: "Perfil clínico independente de instrumentos proprietários: registra subtotais informados, não reproduz itens e não estabelece diagnóstico. Na observação integrada, o escore total é apenas transcrito quando já obtido por meio autorizado. 'Não avaliado' nunca é convertido em zero ou em resultado preservado.",
  fields: [
    COGNITIVE_DOMAIN_OBSERVATION_INSTRUMENT_FIELD,
    COGNITIVE_DOMAIN_OBSERVATION_SCORE_FIELD,
    ...COGNITIVE_DOMAIN_OBSERVATION_FIELDS.map((field) => ({
    id: field.id,
    label: field.label,
    optional: true,
    instrument: "clinical_observation",
    choices: STATUS_CHOICES,
    })),
    ...COGNITIVE_DOMAIN_OBSERVATION_SUBTOTAL_FIELDS,
  ],
} as const;

function asStatus(value: unknown, field: string): CognitiveDomainObservationStatus {
  if (value === "not_assessed" || value === "no_change_observed" || value === "change_observed") return value;
  throw new Error(`Perfil cognitivo inválido para ${field}.`);
}

function asInstrument(value: unknown): CognitiveDomainObservationInstrument {
  if (value === "meem" || value === "moca" || value === "clinical_observation") return value;
  // v1 records did not identify the source; preserve them as a neutral clinical observation.
  if (value === undefined) return "clinical_observation";
  throw new Error("Selecione MEEM, MoCA ou observação cognitiva integrada.");
}

function asOptionalScore(value: unknown): number | null {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > 30) {
    throw new Error("Escore total informado deve ser um número inteiro de 0 a 30.");
  }
  return value;
}

type CognitiveScreenBand = "normal" | "mild" | "moderate" | "severe";

function cognitiveScreenBand(instrument: "meem" | "moca", score: number): CognitiveScreenBand {
  if (instrument === "moca") {
    if (score >= 26) return "normal";
    if (score >= 18) return "mild";
    if (score >= 10) return "moderate";
    return "severe";
  }
  if (score >= 24) return "normal";
  if (score >= 20) return "mild";
  if (score >= 10) return "moderate";
  return "severe";
}

export function cognitiveScreenClassification(instrument: "meem" | "moca", score: number): string {
  const band = cognitiveScreenBand(instrument, score);
  if (band === "normal") return instrument === "moca"
    ? "Cognição Normal no rastreio"
    : "Cognição Preservada (Normal) no rastreio";
  if (band === "mild") return instrument === "moca"
    ? "Comprometimento Cognitivo Leve (CCL / MCI) — faixa de rastreio"
    : "Comprometimento Cognitivo Leve — faixa de rastreio";
  if (band === "moderate") return "Comprometimento Cognitivo Moderado — faixa de rastreio";
  return "Comprometimento Cognitivo Grave — faixa de rastreio";
}

function cognitiveScreenColor(instrument: "meem" | "moca", score: number): "verde" | "amarelo" | "vermelho" {
  const band = cognitiveScreenBand(instrument, score);
  return band === "normal" ? "verde" : band === "mild" ? "amarelo" : "vermelho";
}

export function scoreCognitiveDomainObservation(raw: Record<string, unknown>) {
  const allowed = new Set<string>([
    COGNITIVE_DOMAIN_OBSERVATION_INSTRUMENT_FIELD.id,
    COGNITIVE_DOMAIN_OBSERVATION_SCORE_FIELD.id,
    ...COGNITIVE_DOMAIN_OBSERVATION_FIELDS.map((field) => field.id),
    ...COGNITIVE_DOMAIN_OBSERVATION_SUBTOTAL_FIELDS.map((field) => field.id),
  ]);
  if (Object.keys(raw).some((key) => !allowed.has(key))) {
    throw new Error("Perfil cognitivo contém campo não permitido.");
  }

  const instrument = asInstrument(raw.instrument);
  if ((instrument === "meem" || instrument === "moca") && raw.score !== undefined && raw.score !== null && raw.score !== "") {
    throw new Error("Para MEEM/MoCA, o escore total é calculado a partir dos subtotais informados.");
  }
  const score = asOptionalScore(raw.score);
  const instrumentFields = COGNITIVE_DOMAIN_OBSERVATION_SUBTOTAL_FIELDS.filter((field) => field.instrument === instrument);
  for (const field of instrumentFields) {
    const value = raw[field.id];
    const validNumber = "number" in field && field.number
      ? typeof value === "number" && Number.isInteger(value) && value >= field.number.min && value <= field.number.max
      : false;
    const validChoice = "choices" in field && field.choices
      ? field.choices.some((choice) => choice.value === value)
      : false;
    if (!validNumber && !validChoice) {
      throw new Error(`Preencha o subtotal ${field.label}.`);
    }
  }
  if (instrument === "clinical_observation") {
    for (const field of COGNITIVE_DOMAIN_OBSERVATION_FIELDS) asStatus(raw[field.id], field.label);
  }
  const answers = Object.fromEntries([
    [COGNITIVE_DOMAIN_OBSERVATION_INSTRUMENT_FIELD.id, instrument],
    ...(score === null ? [] : [[COGNITIVE_DOMAIN_OBSERVATION_SCORE_FIELD.id, score]]),
    ...COGNITIVE_DOMAIN_OBSERVATION_FIELDS.flatMap((field) => raw[field.id] === undefined ? [] : [[field.id, asStatus(raw[field.id], field.label)]]),
    ...COGNITIVE_DOMAIN_OBSERVATION_SUBTOTAL_FIELDS.flatMap((field) => raw[field.id] === undefined ? [] : [[field.id, raw[field.id]]]),
  ]) as Record<string, CognitiveDomainObservationStatus | CognitiveDomainObservationInstrument | number>;
  const instrumentLabel = INSTRUMENT_LABELS[instrument];
  const subtotalValues = instrumentFields.filter((field) => field.id !== "meem_education" && field.id !== "moca_education_years").map((field) => Number(answers[field.id]));
  const rawSubtotalScore = instrument === "clinical_observation" ? null : subtotalValues.reduce((sum, value) => sum + value, 0);
  const correctedScore = instrument === "moca"
    ? Math.min(30, (rawSubtotalScore ?? 0) + (Number(answers.moca_education_years) <= 12 ? 1 : 0))
    : rawSubtotalScore;
  const assessed = instrument === "clinical_observation"
    ? COGNITIVE_DOMAIN_OBSERVATION_FIELDS.filter((field) => answers[field.id] !== "not_assessed")
    : instrumentFields.filter((field) => field.id !== "meem_education" && field.id !== "moca_education_years");
  const altered = instrument === "clinical_observation" ? assessed.filter((field) => answers[field.id] === "change_observed") : [];

  const classification = instrument !== "clinical_observation"
    ? cognitiveScreenClassification(instrument, correctedScore ?? 0)
    : assessed.length === 0
      ? "Domínios não avaliados nesta consulta"
      : altered.length > 0
        ? "Alterações cognitivas clínicas registradas"
        : "Sem alteração observada nos domínios avaliados";
  const domainText = instrument !== "clinical_observation"
    ? `${assessed.length} subtotais informados`
    : assessed.length === 0
      ? "Nenhum domínio avaliado"
    : altered.length > 0
      ? `${altered.length} domínio(s) com alteração observada`
      : `${assessed.length} domínio(s) avaliados sem alteração observada`;
  const scoreText = instrument === "clinical_observation"
    ? score === null ? `${instrumentLabel} — ${domainText}` : `${instrumentLabel} — escore informado ${score}/30 · ${domainText}`
    : instrument === "moca"
      ? `${instrumentLabel} — bruto ${rawSubtotalScore}/30 · corrigido ${correctedScore}/30 · ${domainText}`
      : `${instrumentLabel} — ${correctedScore}/30 · ${domainText}`;
  const alteredLabels = altered.map((field) => field.label);

  return {
    answers,
    version: COGNITIVE_DOMAIN_OBSERVATION_VERSION,
    result: {
      score: correctedScore ?? score,
      scoreText,
      classification,
      interpretation: alteredLabels.length > 0
        ? `Alterações observadas em: ${alteredLabels.join(", ")}. ${instrumentLabel} sujeito à revisão médica; o registro não corresponde a subescore de MEEM ou MoCA e não define etiologia ou diagnóstico isoladamente.`
        : assessed.length > 0
          ? instrument === "clinical_observation"
            ? `Não foram registradas alterações nos domínios avaliados nesta consulta para ${instrumentLabel}. Esse achado não exclui comprometimento cognitivo sutil e deve ser integrado à história e à funcionalidade.`
            : `${instrumentLabel}: ${cognitiveScreenClassification(instrument, correctedScore ?? 0)}. O resultado é rastreio, não diagnóstico; integrar escolaridade, história e funcionalidade.`
          : "Não há dados suficientes para descrever o perfil cognitivo nesta consulta.",
      clinicalColor: instrument !== "clinical_observation"
        ? cognitiveScreenColor(instrument, correctedScore ?? 0)
        : altered.length > 0 ? "amarelo" as const : assessed.length > 0 ? "verde" as const : "cinza" as const,
    },
  };
}
