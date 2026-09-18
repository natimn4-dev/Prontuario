import type { AgaScaleReportSection } from "./aga-report.ts";
import {
  contextualFamilyGuidance,
  deriveFamilyFunctionalContext,
} from "./family-functional-context.ts";
import {
  contextualizeImmobilityDomainGuidance,
  deriveEstablishedImmobilityContext,
} from "./family-contextual-care.ts";
import type {
  IntrinsicCapacityDomainCode,
  IntrinsicCapacityEvidenceReference,
  IntrinsicCapacityGuidance,
} from "./intrinsic-capacity-guidance.ts";
import { intrinsicCapacityGuidanceForDomain } from "./intrinsic-capacity-guidance.ts";
import { COGNITIVE_DOMAIN_OBSERVATION_FIELDS } from "./cognitive-domain-observation.ts";

export type ReportDomainState = "altered" | "attention" | "preserved" | "not-assessed";

export interface ReportDomainSummary {
  code: string;
  label: string;
  state: ReportDomainState;
  stateLabel: string;
  results: { scaleCode: string; scaleName: string; value: string }[];
  guidance: string[];
  evidenceReferences: IntrinsicCapacityEvidenceReference[];
  requiresMedicalGuidance: boolean;
}

const DIMENSION_LABELS: Readonly<Record<string, string>> = {
  funcionalidade: "Funcionalidade",
  cognicao: "Cognição",
  humor: "Humor e saúde mental",
  fragilidade: "Fragilidade",
  mobilidade: "Locomoção e equilíbrio",
  nutricao: "Nutrição e vitalidade",
  medicamentos: "Medicamentos",
  "suporte-social": "Família e rede de apoio",
  oncogeriatria: "Oncogeriatria",
  prognostico: "Prognóstico e cuidados paliativos",
  sintomas: "Sintomas",
  outros: "Outras avaliações",
};

const DIMENSION_ORDER = [
  "funcionalidade",
  "cognicao",
  "humor",
  "fragilidade",
  "mobilidade",
  "nutricao",
  "medicamentos",
  "suporte-social",
  "oncogeriatria",
  "prognostico",
  "sintomas",
  "outros",
] as const;

const INTRINSIC_DOMAIN_FOR_DIMENSION: Readonly<Partial<Record<string, IntrinsicCapacityDomainCode>>> = {
  mobilidade: "locomocao",
  cognicao: "cognicao",
  humor: "psicologico",
  nutricao: "vitalidade",
};

type DomainGuidance = {
  actions: readonly string[];
  evidenceReferences: readonly IntrinsicCapacityEvidenceReference[];
};

const DOMAIN_GUIDANCE: Readonly<Partial<Record<string, DomainGuidance>>> = {
  funcionalidade: {
    actions: [
      "Facilite as atividades em que houve dificuldade com organização do ambiente, utensílios simples e ajuda apenas na medida necessária, preservando a participação segura.",
      "Observe e anote mudanças em banho, vestir-se, alimentação, transferências e tarefas domésticas para discutir na próxima revisão.",
      "Se a dificuldade estiver aumentando, peça à equipe que revise barreiras do domicílio e a necessidade de treinamento funcional individualizado.",
    ],
    evidenceReferences: [{
      label: "Intervenções de terapia ocupacional para atividades de vida diária em idosos",
      pmid: "29953830",
      url: "https://pubmed.ncbi.nlm.nih.gov/29953830/",
      relevance: "Revisão sistemática: intervenções domiciliares e adequação do ambiente podem beneficiar idosos com dificuldade nas atividades diárias.",
    }],
  },
  fragilidade: {
    actions: [
      "Fragilidade não significa que a pessoa deva parar: manter movimento seguro e regular ajuda a preservar força, equilíbrio e independência. Priorize as atividades e exercícios que já foram considerados seguros para ela, respeitando limites e necessidade de supervisão.",
      "Organize o dia em etapas curtas, com pausas antes de chegar à exaustão. Evite longos períodos de imobilidade e incentive participação nas tarefas que a pessoa ainda consegue realizar com segurança.",
      "Avise a equipe se houver perda de peso sem intenção, redução de força, mais dificuldade para levantar ou caminhar, quedas ou cansaço que esteja aumentando. Esses sinais merecem revisão porque a fragilidade pode mudar ao longo do tempo.",
    ],
    evidenceReferences: [
      {
        label: "Intervenções multidomínio para fragilidade e pré-fragilidade",
        pmid: "42620771",
        url: "https://pubmed.ncbi.nlm.nih.gov/42620771/",
        relevance: "Revisão sistemática: exercício, especialmente treinamento funcional e de resistência, apresenta benefícios consistentes; apoio nutricional pode complementar uma abordagem individualizada e multidomínio.",
      },
      {
        label: "Exercício e força muscular em pessoas idosas",
        pmid: "42570706",
        url: "https://pubmed.ncbi.nlm.nih.gov/42570706/",
        relevance: "Revisão sistemática e meta-análise: exercício resistido melhora força muscular; intervenções devem ser adaptadas à capacidade e segurança de cada pessoa.",
      },
    ],
  },
  medicamentos: {
    actions: [
      "Mantenha uma lista única e atualizada de medicamentos, doses e horários e leve-a a consultas, urgências e internações.",
      "Não inicie, suspenda, substitua ou ajuste medicamentos por conta própria; dúvidas e mudanças devem ser confirmadas pela equipe responsável.",
      "Avise a equipe após nova queda, tontura, sonolência, confusão, sangramento, hipoglicemia ou dificuldade para organizar os horários.",
    ],
    evidenceReferences: [
      {
        label: "STOPP/START versão 3",
        pmid: "37256475",
        url: "https://pubmed.ncbi.nlm.nih.gov/37256475/",
        relevance: "Consenso europeu atualizado para revisão estruturada de prescrições potencialmente inadequadas e omissões em idosos.",
      },
      {
        label: "Consenso STOPPFall",
        pmid: "33349863",
        url: "https://pubmed.ncbi.nlm.nih.gov/33349863/",
        relevance: "Consenso identifica classes de medicamentos associadas a quedas e apoia revisão individualizada, sem retirada automática.",
      },
    ],
  },
  "suporte-social": {
    actions: [
      "Divida tarefas de cuidado entre pessoas disponíveis e deixe por escrito quem ajuda em medicamentos, alimentação, higiene, deslocamentos e consultas.",
      "Programe pausas regulares e uma pessoa de apoio para o cuidador; sobrecarga persistente deve ser comunicada à equipe.",
      "Use orientação e treinamento prático para lidar com tarefas difíceis e alterações de comportamento, respeitando limites do paciente e do cuidador.",
    ],
    evidenceReferences: [{
      label: "Intervenção multicomponente REACH II para cuidadores de pessoas com demência",
      pmid: "29233097",
      url: "https://pubmed.ncbi.nlm.nih.gov/29233097/",
      relevance: "Ensaio clínico: apoio estruturado, treinamento e acompanhamento podem reduzir ou estabilizar a sobrecarga do cuidador.",
    }],
  },
  oncogeriatria: {
    actions: [
      "Leve este resumo às consultas de oncologia e geriatria para que função, cognição, nutrição, medicamentos e apoio social sejam considerados em conjunto.",
      "Registre sintomas novos, redução da ingestão, quedas, confusão, perda funcional e dificuldade do cuidador durante o tratamento e comunique precocemente à equipe.",
      "Confirme com a equipe o canal de contato e quais sintomas exigem avaliação no mesmo dia durante o tratamento.",
    ],
    evidenceReferences: [{
      label: "Atualização da diretriz ASCO de avaliação geriátrica em oncologia",
      pmid: "37459573",
      url: "https://pubmed.ncbi.nlm.nih.gov/37459573/",
      relevance: "Diretriz recomenda avaliação geriátrica e manejo orientado pelos domínios identificados em idosos recebendo terapia sistêmica.",
    }],
  },
  prognostico: {
    actions: [
      "Mantenha acessíveis os contatos da equipe, as preferências de cuidado já discutidas e o plano combinado para piora de sintomas.",
      "Registre mudanças em dor, falta de ar, ingestão, consciência, mobilidade e necessidade de ajuda para facilitar ajustes do plano pela equipe.",
      "Compartilhe com a equipe as prioridades do paciente e da família, especialmente quando houver mudança importante de funcionalidade ou sintomas.",
    ],
    evidenceReferences: [{
      label: "Cuidados paliativos e desfechos de pacientes e cuidadores",
      pmid: "27893131",
      url: "https://pubmed.ncbi.nlm.nih.gov/27893131/",
      relevance: "Meta-análise de ensaios clínicos: cuidados paliativos foram associados a melhor qualidade de vida, carga de sintomas e planejamento do cuidado.",
    }],
  },
  sintomas: {
    actions: [
      "Anote a intensidade dos sintomas no mesmo horário e informe quais interferem em sono, alimentação, mobilidade ou atividades do dia.",
      "Use o canal combinado com a equipe quando um sintoma piorar, surgir de forma nova ou deixar de responder às medidas já orientadas.",
      "Sintoma intenso isolado deve ser comunicado mesmo que a soma global da escala pareça baixa.",
    ],
    evidenceReferences: [{
      label: "Cuidados paliativos e carga de sintomas",
      pmid: "27893131",
      url: "https://pubmed.ncbi.nlm.nih.gov/27893131/",
      relevance: "Meta-análise: acompanhamento paliativo estruturado pode melhorar carga de sintomas e qualidade de vida em doença grave.",
    }],
  },
};

const LATE_LIFE_DEPRESSION_GUIDANCE: readonly string[] = [
  "Um resultado alterado na GDS é um sinal para olhar o humor com cuidado. Tristeza persistente, perda de interesse, apatia ou isolamento não devem ser tratados como algo esperado do envelhecimento. Acolha o relato sem julgamento e compartilhe mudanças com a equipe assistencial.",
  "Ajude a manter uma rotina simples, com horários regulares, alimentação, movimento seguro e pelo menos uma atividade prazerosa ou contato com alguém de confiança. Se já houver tratamento, incentive o acompanhamento e não altere medicamentos por conta própria.",
  "Se houver fala sobre morte, desesperança intensa, intenção de se machucar ou risco para outra pessoa, permaneça com a pessoa e procure ajuda imediatamente.",
];

const LATE_LIFE_DEPRESSION_EVIDENCE: readonly IntrinsicCapacityEvidenceReference[] = [
  {
    label: "Tratamento da depressão em pessoas idosas",
    pmid: "36649548",
    url: "https://pubmed.ncbi.nlm.nih.gov/36649548/",
    relevance: "Revisão clínica: psicoterapia e tratamento farmacológico podem ser eficazes na depressão tardia; a escolha deve ser individualizada e acompanhada clinicamente.",
  },
  {
    label: "Depressão tardia e risco de suicídio",
    pmid: "40809860",
    url: "https://pubmed.ncbi.nlm.nih.gov/40809860/",
    relevance: "Revisão destaca a necessidade de reconhecer risco suicida e intervir precocemente em pessoas idosas com depressão.",
  },
];

const IADL_FAMILY_GUIDANCE: readonly string[] = [
  "Atenção às atividades fora do domicílio ou mais complexas, como finanças, compras, transporte, organização da casa e medicamentos. Essa fase é de autonomia vigiada: preserve o que a pessoa ainda faz com segurança e acompanhe de perto o que já traz risco ou erros.",
  "Evite retirar toda a independência de uma vez. Ofereça ajuda proporcional à dificuldade e reavalie se novas tarefas passarem a exigir supervisão.",
];

function unique(items: readonly string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

function scoreNumber(scale: AgaScaleReportSection): number | undefined {
  if (typeof scale.result.score === "number" && Number.isFinite(scale.result.score)) return scale.result.score;
  const scoreText = scale.result.scoreText?.trim();
  if (!scoreText) return undefined;
  const corrected = scoreText.match(/corrigido\s+(\d+(?:[.,]\d+)?)/i);
  const first = scoreText.match(/(\d+(?:[.,]\d+)?)/);
  const raw = corrected?.[1] ?? first?.[1];
  if (!raw) return undefined;
  const parsed = Number(raw.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isMocaScale(scale: AgaScaleReportSection): boolean {
  return scale.code === "moca" || scale.code === "moca_br_freitas";
}

function isGdsScale(scale: AgaScaleReportSection): boolean {
  return scale.code === "gds15" || scale.code === "gds_15";
}

function currentMocaScore(scales: readonly AgaScaleReportSection[]): number | undefined {
  const moca = scales.find((scale) => scale.assessedInTargetConsultation && isMocaScale(scale));
  return moca ? scoreNumber(moca) : undefined;
}

function currentGdsScore(scales: readonly AgaScaleReportSection[]): number | undefined {
  const gds = scales.find((scale) => scale.assessedInTargetConsultation && isGdsScale(scale));
  return gds ? scoreNumber(gds) : undefined;
}

function functionalDependenceDetected(scales: readonly AgaScaleReportSection[]): boolean {
  return scales.some((scale) => {
    if (!scale.assessedInTargetConsultation || typeof scale.result.score !== "number") return false;
    if (scale.code === "katz") return scale.result.score < 6;
    if (scale.code === "barthel") return scale.result.score < 100;
    if (scale.code === "lawton") return scale.result.score < 21;
    return false;
  });
}

function stateFor(scales: readonly AgaScaleReportSection[], dimension: string): ReportDomainState {
  const current = scales.filter((scale) => scale.assessedInTargetConsultation);
  if (current.length === 0) return "not-assessed";
  // ABVD ou AIVD comprometida é alteração funcional, independentemente de uma cor
  // técnica ausente/inconsistente em registros legados.
  if (dimension === "funcionalidade" && functionalDependenceDetected(current)) return "altered";
  if (current.some((scale) => scale.clinicalColor === "vermelho")) return "altered";

  const mocaScore = dimension === "cognicao" ? currentMocaScore(current) : undefined;
  if (typeof mocaScore === "number" && mocaScore <= 17) return "altered";

  const gdsScore = dimension === "humor" ? currentGdsScore(current) : undefined;
  if (typeof gdsScore === "number" && gdsScore >= 11) return "altered";

  if (current.some((scale) => scale.clinicalColor === "amarelo")) return "attention";
  if (typeof mocaScore === "number" && mocaScore >= 18 && mocaScore <= 25) return "attention";
  if (typeof gdsScore === "number" && gdsScore >= 6) return "attention";
  return "preserved";
}

function stateLabelFor(state: ReportDomainState): string {
  if (state === "altered") return "Alteração identificada — requer atenção";
  if (state === "attention") return "Sinal de atenção";
  if (state === "preserved") return "Sem alteração sinalizada nesta consulta";
  return "Não avaliado nesta consulta";
}

function familyResultValue(scale: AgaScaleReportSection): string {
  if (scale.code === "cognitive_domain_observation") {
    const labels = new Map<string, string>(COGNITIVE_DOMAIN_OBSERVATION_FIELDS.map((field) => [field.id, field.label]));
    const altered = scale.collectedData
      .filter((item) => item.value === "change_observed")
      .map((item) => labels.get(item.field) ?? item.field);
    if (altered.length > 0) return `Alterações observadas: ${altered.join(", ")}. Registro descritivo, sem diagnóstico automático.`;
    const assessed = scale.collectedData.filter((item) => item.value !== "not_assessed");
    return assessed.length > 0
      ? "Sem alteração observada nos domínios avaliados; o achado não exclui comprometimento sutil."
      : "Domínios não avaliados nesta consulta.";
  }
  const score = scale.result.scoreText ?? (scale.result.score !== null ? String(scale.result.score) : undefined);
  return unique([score ?? "Resultado registrado", scale.result.classification ?? ""]).join(" — ");
}

function familyScaleName(scale: AgaScaleReportSection): string {
  if (isMocaScale(scale)) return "MoCA";
  if (scale.code === "cognitive_domain_observation") return "Perfil cognitivo por domínios";
  if (scale.code === "lawton") return "AIVD — atividades instrumentais da vida diária (Lawton)";
  if (scale.code === "katz") return "ABVD — atividades básicas da vida diária (Katz)";
  if (scale.code === "barthel") return "ABVD — atividades básicas da vida diária (Barthel)";
  return scale.name;
}

export function buildReportDomainSummaries(
  scales: readonly AgaScaleReportSection[],
  intrinsicCapacity: IntrinsicCapacityGuidance,
): ReportDomainSummary[] {
  const grouped = new Map<string, AgaScaleReportSection[]>();
  for (const scale of scales.filter((item) => item.assessedInTargetConsultation)) {
    const items = grouped.get(scale.dimension) ?? [];
    items.push(scale);
    grouped.set(scale.dimension, items);
  }

  const functionalContext = deriveFamilyFunctionalContext(scales);
  const immobilityContext = deriveEstablishedImmobilityContext({ scales });

  return DIMENSION_ORDER.flatMap((dimension): ReportDomainSummary[] => {
    const dimensionScales = grouped.get(dimension);
    if (!dimensionScales?.length) return [];

    const state = stateFor(dimensionScales, dimension);
    const intrinsicCode = INTRINSIC_DOMAIN_FOR_DIMENSION[dimension];
    const alteredIntrinsicGuidance = intrinsicCode
      ? intrinsicCapacity.alteredDomains.find((domain) => domain.code === intrinsicCode)
      : undefined;
    const intrinsicGuidance = intrinsicCode
      ? intrinsicCapacityGuidanceForDomain(intrinsicCode)
      : undefined;
    const domainGuidance = DOMAIN_GUIDANCE[dimension];
    const genericGuidance = unique([
      ...(alteredIntrinsicGuidance?.actions ?? intrinsicGuidance?.actions ?? domainGuidance?.actions ?? []),
    ]);
    const functionallyContextualized = contextualFamilyGuidance(
      dimension,
      genericGuidance,
      functionalContext,
    );
    const gdsScore = dimension === "humor" ? currentGdsScore(dimensionScales) : undefined;
    const isAlteredGds = typeof gdsScore === "number" && gdsScore >= 6;
    const isIadlSupport = dimension === "funcionalidade" && functionalContext.level === "iadl-support";
    // Imobilidade contextualiza mobilidade, mas não pode apagar a orientação de
    // Funcionalidade derivada de Katz/Barthel/Lawton.
    const contextGuidance = isIadlSupport
      ? IADL_FAMILY_GUIDANCE
      : isAlteredGds
        ? LATE_LIFE_DEPRESSION_GUIDANCE
        : dimension === "funcionalidade"
          ? functionallyContextualized
          : contextualizeImmobilityDomainGuidance(
              dimension,
              functionallyContextualized,
              immobilityContext,
            );
    const guidance = unique(contextGuidance).slice(0, isAlteredGds ? 3 : 2);
    const requiresMedicalGuidance = (state === "altered" || state === "attention") && guidance.length === 0;
    const evidenceReferences = isAlteredGds
      ? LATE_LIFE_DEPRESSION_EVIDENCE
      : alteredIntrinsicGuidance?.evidenceReferences
        ?? intrinsicGuidance?.evidenceReferences
        ?? domainGuidance?.evidenceReferences
        ?? [];

    return [{
      code: dimension,
      label: DIMENSION_LABELS[dimension] ?? dimension,
      state,
      stateLabel: stateLabelFor(state),
      results: dimensionScales.map((scale) => ({
        scaleCode: scale.code,
        scaleName: familyScaleName(scale),
        value: familyResultValue(scale),
      })),
      guidance,
      evidenceReferences: evidenceReferences.map((reference) => ({ ...reference })),
      requiresMedicalGuidance,
    }];
  });
}
