export const COGNITIVE_DOMAIN_OBSERVATION_CODE = "cognitive_domain_observation" as const;
export const COGNITIVE_DOMAIN_OBSERVATION_VERSION = "clinical-cognitive-domain-observation-2026-09-v1" as const;

export type CognitiveDomainObservationStatus = "not_assessed" | "no_change_observed" | "change_observed";

const STATUS_CHOICES = [
  { value: "not_assessed", label: "Não avaliado nesta consulta" },
  { value: "no_change_observed", label: "Sem alteração observada" },
  { value: "change_observed", label: "Alteração observada" },
] as const;

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
  name: "Perfil cognitivo por domínios — registro clínico",
  dimension: "cognicao" as const,
  instruction: "Registre a observação clínica de cada domínio após integrar entrevista, exame e testes aplicados por meio autorizado. Este perfil é independente do MEEM e do MoCA: não reproduz itens, não calcula subescores e não estabelece diagnóstico.",
  sourceNote: "Registro clínico descritivo e independente de instrumentos proprietários. Os estados significam apenas o que foi observado e documentado nesta consulta; 'não avaliado' nunca é convertido em zero ou em resultado preservado.",
  fields: COGNITIVE_DOMAIN_OBSERVATION_FIELDS.map((field) => ({
    id: field.id,
    label: field.label,
    choices: STATUS_CHOICES,
  })),
} as const;

function asStatus(value: unknown, field: string): CognitiveDomainObservationStatus {
  if (value === "not_assessed" || value === "no_change_observed" || value === "change_observed") return value;
  throw new Error(`Perfil cognitivo inválido para ${field}.`);
}

export function scoreCognitiveDomainObservation(raw: Record<string, unknown>) {
  const allowed = new Set<string>(COGNITIVE_DOMAIN_OBSERVATION_FIELDS.map((field) => field.id));
  if (Object.keys(raw).some((key) => !allowed.has(key))) {
    throw new Error("Perfil cognitivo contém campo não permitido.");
  }

  const answers = Object.fromEntries(COGNITIVE_DOMAIN_OBSERVATION_FIELDS.map((field) => [
    field.id,
    asStatus(raw[field.id], field.label),
  ])) as Record<string, CognitiveDomainObservationStatus>;
  const assessed = COGNITIVE_DOMAIN_OBSERVATION_FIELDS.filter((field) => answers[field.id] !== "not_assessed");
  const altered = assessed.filter((field) => answers[field.id] === "change_observed");

  const classification = assessed.length === 0
    ? "Domínios não avaliados nesta consulta"
    : altered.length > 0
      ? "Alterações cognitivas clínicas registradas"
      : "Sem alteração observada nos domínios avaliados";
  const scoreText = assessed.length === 0
    ? "Nenhum domínio avaliado"
    : altered.length > 0
      ? `${altered.length} domínio(s) com alteração observada`
      : `${assessed.length} domínio(s) avaliados sem alteração observada`;
  const alteredLabels = altered.map((field) => field.label);

  return {
    answers,
    version: COGNITIVE_DOMAIN_OBSERVATION_VERSION,
    result: {
      score: null,
      scoreText,
      classification,
      interpretation: alteredLabels.length > 0
        ? `Alterações observadas em: ${alteredLabels.join(", ")}. Registro descritivo sujeito à revisão médica; não corresponde a subescore de MEEM ou MoCA e não define etiologia ou diagnóstico isoladamente.`
        : assessed.length > 0
          ? "Não foram registradas alterações nos domínios avaliados nesta consulta. Esse achado não exclui comprometimento cognitivo sutil e deve ser integrado à história e à funcionalidade."
          : "Não há dados suficientes para descrever o perfil cognitivo nesta consulta.",
      clinicalColor: altered.length > 0 ? "amarelo" as const : assessed.length > 0 ? "verde" as const : "cinza" as const,
    },
  };
}
