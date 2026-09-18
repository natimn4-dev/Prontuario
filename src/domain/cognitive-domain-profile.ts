export const COGNITIVE_DOMAIN_PROFILE_VERSION = "cognitive-domain-profile-2026-09-v1" as const;

export const COGNITIVE_DOMAIN_KEYS = [
  "orientation_temporal",
  "orientation_spatial",
  "orientation_global",
  "immediate_memory",
  "attention_working_memory",
  "delayed_recall",
  "executive_visuospatial",
  "naming",
  "language",
  "repetition",
  "reading",
  "writing",
  "comprehension_commands",
  "abstraction",
  "verbal_fluency",
] as const;

export type CognitiveDomainKey = (typeof COGNITIVE_DOMAIN_KEYS)[number];
export type CognitiveDomainStatus = "NO_RECORDED_ERROR" | "ERRORS_PRESENT" | "ALTERED_VALIDATED_RULE" | "RECORDED_NO_CUTOFF" | "CLINICAL_ALTERATION_RECORDED";
export type CognitiveProfileCode = "INSUFFICIENT" | "AMNESTIC" | "EXECUTIVE_VISUOSPATIAL" | "LANGUAGE" | "MULTIDOMAIN";

export type CognitiveScaleInput = {
  scaleCode: string;
  scaleVersion: string;
  answers: unknown;
  scoreNumeric?: number | null;
  scoreText?: string | null;
  classification?: string | null;
  interpretation?: string | null;
  appliedAt: string;
};

export type CognitiveDomainObservation = {
  scaleCode: string;
  scaleName: string;
  value: number;
  max?: number;
  display: string;
  status: CognitiveDomainStatus;
  interpretation: string;
};

export type CognitiveDomainSummary = {
  key: CognitiveDomainKey;
  label: string;
  status: CognitiveDomainStatus;
  interpretation: string;
  observations: CognitiveDomainObservation[];
};

export type CognitiveDomainSnapshot = {
  version: typeof COGNITIVE_DOMAIN_PROFILE_VERSION;
  profile: CognitiveProfileCode;
  profileLabel: string;
  profileExplanation: string;
  domains: CognitiveDomainSummary[];
  scaleSummaries: Array<{
    scaleCode: string;
    scaleName: string;
    scoreText: string;
    classification?: string;
    appliedAt: string;
    detailedDomainsAvailable: boolean;
  }>;
  missingDetail: string[];
};

export type DementiaInterpretationForProfile = {
  pathway?: string;
  hypotheses?: Array<{
    etiology: string;
    label: string;
    support: "LOW" | "MODERATE" | "HIGH";
    supporting?: string[];
    limiting?: string[];
  }>;
};

export type CognitiveEtiologySynthesis = {
  status: "AVAILABLE" | "INSUFFICIENT_CLINICAL_DATA" | "INTERRUPTED_PATHWAY" | "MIXED_OR_INDETERMINATE";
  heading: string;
  leadingEtiology?: string;
  leadingLabel?: string;
  support?: "LOW" | "MODERATE" | "HIGH";
  rationale: string;
  additionalDifferential?: string;
  disclaimer: string;
};

const DOMAIN_LABELS: Readonly<Record<CognitiveDomainKey, string>> = {
  orientation_temporal: "Orientação temporal",
  orientation_spatial: "Orientação espacial",
  orientation_global: "Orientação",
  immediate_memory: "Memória imediata / registro",
  attention_working_memory: "Atenção / memória operacional",
  delayed_recall: "Memória recente / evocação tardia",
  executive_visuospatial: "Função executiva / visuoespacial",
  naming: "Nomeação",
  language: "Linguagem",
  repetition: "Repetição",
  reading: "Leitura e execução",
  writing: "Escrita",
  comprehension_commands: "Compreensão / comandos",
  abstraction: "Abstração",
  verbal_fluency: "Fluência verbal semântica",
};

const PROFILE_LABELS: Readonly<Record<CognitiveProfileCode, string>> = {
  INSUFFICIENT: "Sem predomínio definido pelos itens registrados",
  AMNESTIC: "Predomínio amnéstico nos itens de rastreio",
  EXECUTIVE_VISUOSPATIAL: "Predomínio executivo/visuoespacial nos itens de rastreio",
  LANGUAGE: "Predomínio de linguagem nos itens de rastreio",
  MULTIDOMAIN: "Padrão multidomínio nos itens de rastreio",
};

const STATUS_WEIGHT: Readonly<Record<CognitiveDomainStatus, number>> = {
  NO_RECORDED_ERROR: 0,
  RECORDED_NO_CUTOFF: 1,
  ERRORS_PRESENT: 2,
  CLINICAL_ALTERATION_RECORDED: 2,
  ALTERED_VALIDATED_RULE: 3,
};

function asNumberRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const entries = Object.entries(value as Record<string, unknown>)
    .filter((entry): entry is [string, number] => typeof entry[1] === "number" && Number.isFinite(entry[1]));
  return Object.fromEntries(entries);
}

function statusFromSubtotal(value: number, max: number): CognitiveDomainStatus {
  return value >= max ? "NO_RECORDED_ERROR" : "ERRORS_PRESENT";
}

function subtotalInterpretation(value: number, max: number): string {
  return value >= max
    ? `Sem erro registrado neste subtotal (${value}/${max}). O resultado isolado não exclui comprometimento cognitivo.`
    : `Foram registrados erros neste subtotal (${value}/${max}). Não há classificação etiológica validada para este subtotal isoladamente; integrar ao perfil cognitivo e ao contexto clínico.`;
}

function scaleName(code: string): string {
  if (code === "cognitive_domain_observation") return "Perfil cognitivo clínico";
  if (code === "meem_freitas" || code === "meem") return "MEEM";
  if (code === "moca_br_freitas" || code === "moca") return "MoCA";
  if (code === "clock_shulman" || code === "clock" || code === "relogio") return "Teste do Relógio";
  if (code === "verbal_fluency_animals") return "Fluência verbal — animais";
  return code;
}

function scaleFamily(code: string): "MEEM" | "MOCA" | "CLOCK" | "FLUENCY" | "PROFILE" | "OTHER" {
  if (code === "cognitive_domain_observation") return "PROFILE";
  if (code === "meem_freitas" || code === "meem") return "MEEM";
  if (code === "moca_br_freitas" || code === "moca") return "MOCA";
  if (code === "clock_shulman" || code === "clock" || code === "relogio") return "CLOCK";
  if (code === "verbal_fluency_animals") return "FLUENCY";
  return "OTHER";
}

function scalePriority(code: string): number {
  if (code === "cognitive_domain_observation") return 30;
  if (code === "meem_freitas" || code === "moca_br_freitas" || code === "clock_shulman" || code === "verbal_fluency_animals") return 20;
  if (code === "meem" || code === "moca" || code === "clock" || code === "relogio") return 10;
  return 0;
}

function preferredScales(scales: readonly CognitiveScaleInput[]): CognitiveScaleInput[] {
  const byFamily = new Map<string, CognitiveScaleInput>();
  for (const scale of [...scales].sort((a, b) => b.appliedAt.localeCompare(a.appliedAt))) {
    const family = scaleFamily(scale.scaleCode);
    if (family === "OTHER") continue;
    const previous = byFamily.get(family);
    if (!previous || scalePriority(scale.scaleCode) > scalePriority(previous.scaleCode)) byFamily.set(family, scale);
  }
  return [...byFamily.values()];
}

function observation(
  scale: CognitiveScaleInput,
  key: CognitiveDomainKey,
  value: number,
  max: number | undefined,
  status: CognitiveDomainStatus,
  interpretation: string,
): { key: CognitiveDomainKey; observation: CognitiveDomainObservation } {
  return {
    key,
    observation: {
      scaleCode: scale.scaleCode,
      scaleName: scaleName(scale.scaleCode),
      value,
      ...(max === undefined ? {} : { max }),
      display: max === undefined ? String(value) : `${value}/${max}`,
      status,
      interpretation,
    },
  };
}

function observationsForScale(scale: CognitiveScaleInput): Array<{ key: CognitiveDomainKey; observation: CognitiveDomainObservation }> {
  const a = asNumberRecord(scale.answers);
  const items: Array<{ key: CognitiveDomainKey; observation: CognitiveDomainObservation }> = [];
  const subtotal = (key: CognitiveDomainKey, field: string, max: number) => {
    const value = a[field];
    if (value === undefined) return;
    items.push(observation(scale, key, value, max, statusFromSubtotal(value, max), subtotalInterpretation(value, max)));
  };

  if (scale.scaleCode === "cognitive_domain_observation") {
    const domainFields: Array<[CognitiveDomainKey, string]> = [
      ["orientation_global", "orientation"],
      ["immediate_memory", "immediate_memory"],
      ["delayed_recall", "delayed_recall"],
      ["attention_working_memory", "attention_working_memory"],
      ["executive_visuospatial", "executive_visuospatial"],
      ["naming", "naming"],
      ["language", "language"],
      ["comprehension_commands", "comprehension_commands"],
      ["abstraction", "abstraction"],
    ];
    const rawAnswers = scale.answers && typeof scale.answers === "object" && !Array.isArray(scale.answers)
      ? scale.answers as Record<string, unknown>
      : {};
    for (const [key, field] of domainFields) {
      const value = rawAnswers[field];
      if (value === "not_assessed" || value === undefined) continue;
      const altered = value === "change_observed";
      const item = observation(
        scale,
        key,
        altered ? 1 : 0,
        undefined,
        altered ? "CLINICAL_ALTERATION_RECORDED" : "NO_RECORDED_ERROR",
        altered
          ? "Alteração clínica registrada neste domínio. O achado é descritivo, não corresponde a subescore de MEEM ou MoCA e deve ser integrado ao contexto clínico."
          : "Sem alteração observada neste domínio durante a avaliação registrada. Esse achado não exclui comprometimento cognitivo sutil.",
      );
      item.observation.display = altered ? "Alteração observada" : "Sem alteração observada";
      items.push(item);
    }
  } else if (scale.scaleCode === "meem_freitas") {
    subtotal("orientation_temporal", "time", 5);
    subtotal("orientation_spatial", "place", 5);
    subtotal("immediate_memory", "registration", 3);
    subtotal("attention_working_memory", "attention", 5);
    subtotal("delayed_recall", "recall", 3);
    subtotal("naming", "naming", 2);
    subtotal("repetition", "repetition", 1);
    subtotal("writing", "writing", 1);
    subtotal("comprehension_commands", "commands", 3);
    subtotal("reading", "reading", 1);
    subtotal("executive_visuospatial", "diagram_copy", 1);
  } else if (scale.scaleCode === "moca_br_freitas") {
    subtotal("executive_visuospatial", "visuospatial", 5);
    subtotal("naming", "naming", 3);
    subtotal("attention_working_memory", "attention", 6);
    subtotal("language", "language", 3);
    subtotal("abstraction", "abstraction", 2);
    subtotal("delayed_recall", "delayed_recall", 5);
    subtotal("orientation_global", "orientation", 6);
  } else if (scale.scaleCode === "clock_shulman") {
    const score = a.score ?? scale.scoreNumeric;
    if (typeof score === "number") {
      const altered = score < 4;
      items.push(observation(
        scale,
        "executive_visuospatial",
        score,
        5,
        altered ? "ALTERED_VALIDATED_RULE" : "NO_RECORDED_ERROR",
        altered
          ? `Teste do Relógio ${score}/5, classificado como alterado pelo método Shulman. Integrar visão, motricidade, escolaridade e demais dados cognitivos.`
          : `Teste do Relógio ${score}/5, sem alteração pela classificação Shulman. O resultado isolado não exclui comprometimento cognitivo.`,
      ));
    }
  } else if (scale.scaleCode === "verbal_fluency_animals") {
    const count = a.animal_count ?? scale.scoreNumeric;
    if (typeof count === "number") {
      items.push(observation(
        scale,
        "verbal_fluency",
        count,
        undefined,
        "RECORDED_NO_CUTOFF",
        `Foram registrados ${count} animais em 60 segundos. A fluência semântica envolve acesso léxico-semântico e componentes executivos; escolaridade influencia o desempenho. O prontuário não aplica ponto de corte universal automático.`,
      ));
    }
  }

  return items;
}

function summarizeDomain(key: CognitiveDomainKey, observations: CognitiveDomainObservation[]): CognitiveDomainSummary {
  const status = observations.reduce<CognitiveDomainStatus>((best, item) =>
    STATUS_WEIGHT[item.status] > STATUS_WEIGHT[best] ? item.status : best, "NO_RECORDED_ERROR");
  const interpretation = status === "ALTERED_VALIDATED_RULE"
    ? "Há alteração por uma regra validada do instrumento nesta dimensão. Correlacionar com os demais domínios e com o contexto clínico."
    : status === "CLINICAL_ALTERATION_RECORDED"
      ? "Há alteração clínica registrada nesta dimensão. O achado é descritivo e não equivale a subescore de instrumento ou diagnóstico."
    : status === "ERRORS_PRESENT"
      ? "Há erros registrados em pelo menos um item/subtotal desta dimensão. Isso descreve o padrão do rastreio, mas não define etiologia isoladamente."
      : status === "RECORDED_NO_CUTOFF"
        ? "Resultado registrado sem ponto de corte automático aplicável no prontuário; interpretar com escolaridade e contexto clínico."
        : "Sem erro registrado nos itens disponíveis desta dimensão. O rastreio isolado não exclui déficit sutil.";
  return { key, label: DOMAIN_LABELS[key], status, interpretation, observations };
}

function hasError(domains: readonly CognitiveDomainSummary[], keys: readonly CognitiveDomainKey[]): boolean {
  return domains.some((domain) => keys.includes(domain.key) && (domain.status === "ERRORS_PRESENT" || domain.status === "ALTERED_VALIDATED_RULE" || domain.status === "CLINICAL_ALTERATION_RECORDED"));
}

function deriveProfile(domains: readonly CognitiveDomainSummary[]): { profile: CognitiveProfileCode; explanation: string } {
  const memory = hasError(domains, ["immediate_memory", "delayed_recall"]);
  const executiveVisuospatial = hasError(domains, ["attention_working_memory", "executive_visuospatial", "abstraction"]);
  const language = hasError(domains, ["naming", "language", "repetition", "reading", "writing", "comprehension_commands"]);
  const affected = [memory, executiveVisuospatial, language].filter(Boolean).length;

  if (affected >= 2) return {
    profile: "MULTIDOMAIN",
    explanation: "Foram registrados erros em dois ou mais grandes grupos cognitivos (memória, executivo/visuoespacial e/ou linguagem). O padrão é descrito como multidomínio, sem inferir etiologia automaticamente.",
  };
  if (memory) return {
    profile: "AMNESTIC",
    explanation: "Os erros registrados concentram-se no grupo de memória, sem erro registrado nos grandes grupos executivo/visuoespacial e de linguagem disponíveis. Trata-se de descrição do padrão dos testes, não diagnóstico etiológico.",
  };
  if (executiveVisuospatial) return {
    profile: "EXECUTIVE_VISUOSPATIAL",
    explanation: "Os erros registrados concentram-se no grupo executivo/visuoespacial/atencional. Esse padrão pode ocorrer em diferentes condições e não identifica uma etiologia isoladamente.",
  };
  if (language) return {
    profile: "LANGUAGE",
    explanation: "Os erros registrados concentram-se em tarefas de linguagem. É necessário integrar história de linguagem/comportamento e avaliação neuropsicológica antes de atribuir etiologia.",
  };
  return {
    profile: "INSUFFICIENT",
    explanation: "Os dados detalhados disponíveis não definem um predomínio cognitivo. Resultados normais de rastreio não excluem comprometimento sutil e resultados score-only não permitem reconstruir subtotais.",
  };
}

export function buildCognitiveDomainSnapshot(scales: readonly CognitiveScaleInput[]): CognitiveDomainSnapshot {
  const preferred = preferredScales(scales);
  const collected = new Map<CognitiveDomainKey, CognitiveDomainObservation[]>();
  for (const scale of preferred) {
    for (const item of observationsForScale(scale)) {
      const current = collected.get(item.key) ?? [];
      current.push(item.observation);
      collected.set(item.key, current);
    }
  }
  const domains = COGNITIVE_DOMAIN_KEYS
    .filter((key) => (collected.get(key)?.length ?? 0) > 0)
    .map((key) => summarizeDomain(key, collected.get(key)!));
  const derived = deriveProfile(domains);
  const detailedFamilies = new Set(preferred.filter((scale) => scalePriority(scale.scaleCode) >= 20).map((scale) => scaleFamily(scale.scaleCode)));
  const missingDetail: string[] = [];
  if (preferred.some((scale) => scaleFamily(scale.scaleCode) === "MEEM") && !detailedFamilies.has("MEEM")) missingDetail.push("MEEM registrado apenas como escore global; subtotais não podem ser inferidos.");
  if (preferred.some((scale) => scaleFamily(scale.scaleCode) === "MOCA") && !detailedFamilies.has("MOCA")) missingDetail.push("MoCA registrado apenas como escore global; subtotais não podem ser inferidos.");
  if (preferred.some((scale) => scaleFamily(scale.scaleCode) === "CLOCK") && !detailedFamilies.has("CLOCK")) missingDetail.push("Teste do Relógio sem registro estruturado compatível; não foi inferida pontuação visuoespacial/executiva.");

  return {
    version: COGNITIVE_DOMAIN_PROFILE_VERSION,
    profile: derived.profile,
    profileLabel: PROFILE_LABELS[derived.profile],
    profileExplanation: derived.explanation,
    domains,
    scaleSummaries: preferred.map((scale) => ({
      scaleCode: scale.scaleCode,
      scaleName: scaleName(scale.scaleCode),
      scoreText: scale.scoreText ?? (scale.scoreNumeric === null || scale.scoreNumeric === undefined ? "Resultado registrado" : String(scale.scoreNumeric)),
      ...(scale.classification ? { classification: scale.classification } : {}),
      appliedAt: scale.appliedAt,
      detailedDomainsAvailable: scalePriority(scale.scaleCode) >= 20,
    })),
    missingDetail,
  };
}

function baseSupportWeight(value: "LOW" | "MODERATE" | "HIGH"): number {
  return value === "HIGH" ? 3 : value === "MODERATE" ? 2 : 1;
}

function profileAlignment(profile: CognitiveProfileCode, etiology: string): number {
  if (profile === "AMNESTIC" && (etiology === "ALZHEIMER" || etiology === "LATE")) return 1;
  if (profile === "EXECUTIVE_VISUOSPATIAL" && (etiology === "LEWY_BODY" || etiology === "VASCULAR")) return 1;
  return 0;
}

export function synthesizeCognitiveEtiology(
  snapshot: CognitiveDomainSnapshot,
  dementia: DementiaInterpretationForProfile | null | undefined,
): CognitiveEtiologySynthesis {
  const disclaimer = "A síntese é apoio à decisão e não constitui diagnóstico. MEEM, MoCA, fluência verbal e Teste do Relógio não estabelecem etiologia isoladamente; a confirmação permanece médica e deve integrar curso, funcionalidade, exame neurológico, neuroimagem e biomarcadores quando indicados.";
  const additionalDifferential = snapshot.profile === "LANGUAGE"
    ? "Predomínio de linguagem: considerar, conforme história e exame, ampliação do diferencial para espectro frontotemporal/afasias progressivas. Este módulo não classifica automaticamente essas etiologias."
    : undefined;

  if (!dementia?.hypotheses?.length) {
    return {
      status: "INSUFFICIENT_CLINICAL_DATA",
      heading: "Hipótese etiológica",
      rationale: "Ainda não há integração clínica suficiente registrada no fluxo de investigação para priorizar uma etiologia. O perfil dos testes permanece descritivo.",
      ...(additionalDifferential ? { additionalDifferential } : {}),
      disclaimer,
    };
  }
  if (dementia.pathway && dementia.pathway !== "CONTINUE_ELECTIVE") {
    return {
      status: "INTERRUPTED_PATHWAY",
      heading: "Hipótese etiológica",
      rationale: "O fluxo clínico atual exige esclarecer condição aguda, progressão rápida ou dados essenciais antes de priorizar etiologia de demência.",
      ...(additionalDifferential ? { additionalDifferential } : {}),
      disclaimer,
    };
  }

  const ranked = dementia.hypotheses.map((hypothesis) => ({
    hypothesis,
    rank: baseSupportWeight(hypothesis.support) + profileAlignment(snapshot.profile, hypothesis.etiology),
  })).sort((a, b) => b.rank - a.rank || baseSupportWeight(b.hypothesis.support) - baseSupportWeight(a.hypothesis.support));
  const top = ranked[0];
  const second = ranked[1];
  if (!top || top.hypothesis.support === "LOW" || (second && second.rank === top.rank)) {
    return {
      status: "MIXED_OR_INDETERMINATE",
      heading: "Hipótese etiológica mais apoiada pelos dados registrados",
      rationale: "Os dados registrados não sustentam uma etiologia única com vantagem suficiente. Considerar etiologia mista/indeterminada e completar a investigação conforme o fenótipo clínico.",
      ...(additionalDifferential ? { additionalDifferential } : {}),
      disclaimer,
    };
  }

  const aligned = profileAlignment(snapshot.profile, top.hypothesis.etiology) > 0;
  return {
    status: "AVAILABLE",
    heading: "Hipótese etiológica mais apoiada pelos dados registrados",
    leadingEtiology: top.hypothesis.etiology,
    leadingLabel: top.hypothesis.label,
    support: top.hypothesis.support,
    rationale: aligned
      ? `${top.hypothesis.label} permanece a hipótese com maior apoio no fluxo clínico e o padrão cognitivo registrado é compatível com essa hipótese. Compatibilidade não equivale a confirmação diagnóstica.`
      : `${top.hypothesis.label} é a hipótese com maior apoio no fluxo clínico registrado. O padrão cognitivo atual não foi usado como confirmação e deve ser integrado aos demais dados.`,
    ...(additionalDifferential ? { additionalDifferential } : {}),
    disclaimer,
  };
}
