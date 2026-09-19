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
import { FRAIL_BR } from "./clinical-config/legacy-core.ts";

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

type FrailtyGuidanceProfile = "robust" | "pre-frail" | "frail";

const FRAILTY_GUIDANCE: Readonly<Record<FrailtyGuidanceProfile, DomainGuidance>> = {
  robust: {
    actions: [
      "O FRAIL-BR não identificou critérios de fragilidade nesta consulta: o perfil é robusto. O objetivo é preservar a reserva e a independência, mantendo atividade física regular com força, equilíbrio e resistência, em intensidade compatível com a capacidade e a segurança da pessoa.",
      "Mantenha alimentação suficiente e variada, hidratação conforme o plano clínico, sono regular e participação social e em atividades significativas. Na ausência de declínio, não é necessário tratar a pessoa como frágil; reavalie se surgirem perda de peso não intencional, fadiga persistente, redução de força, quedas ou perda funcional.",
    ],
    evidenceReferences: [
      {
        label: "Diretriz de detecção e manejo da fragilidade na atenção primária",
        pmid: "42560630",
        url: "https://pubmed.ncbi.nlm.nih.gov/42560630/",
        relevance: "Diretriz clínica de 2026: a abordagem da fragilidade deve ser personalizada e multidimensional, com atividade física, suporte nutricional e revisão de fatores modificáveis conforme o perfil clínico.",
      },
    ],
  },
  "pre-frail": {
    actions: [
      "O FRAIL-BR indica pré-fragilidade — uma janela de oportunidade para evitar progressão. Priorize exercício multicomponente, com força e equilíbrio, adaptado à capacidade e com supervisão quando houver risco; revise nutrição, perda de peso, quedas e medicamentos com a equipe.",
      "Interrompa períodos prolongados sentado ou deitado com atividades seguras e curtas, preservando a participação nas tarefas do dia. Avise a equipe se houver mais fadiga, fraqueza, quedas, redução da ingestão ou dificuldade para caminhar e levantar-se.",
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
  frail: {
    actions: [
      "O FRAIL-BR indica fragilidade e maior vulnerabilidade a doenças e outros estressores. Organize avaliação e plano individualizados, combinando exercício funcional e resistido supervisionado quando seguro, cuidado nutricional, revisão de medicamentos, prevenção de quedas e investigação de causas reversíveis.",
      "Planeje o dia em etapas curtas, oferecendo ajuda antes da exaustão sem retirar toda a participação possível. Comunique perda de peso, redução da ingestão, piora da força, quedas, dificuldade para levantar ou caminhar e qualquer declínio funcional recente.",
    ],
    evidenceReferences: [
      {
        label: "Intervenções multidomínio para fragilidade e pré-fragilidade",
        pmid: "42620771",
        url: "https://pubmed.ncbi.nlm.nih.gov/42620771/",
        relevance: "Revisão sistemática: intervenções de exercício e nutrição devem ser individualizadas e integradas ao cuidado da pessoa idosa frágil.",
      },
      {
        label: "Exercício e força muscular em pessoas idosas",
        pmid: "42570706",
        url: "https://pubmed.ncbi.nlm.nih.gov/42570706/",
        relevance: "Revisão sistemática e meta-análise: exercício resistido melhora força muscular; a prescrição precisa considerar capacidade, comorbidades e segurança.",
      },
    ],
  },
};

const COGNITIVE_SCREEN_GUIDANCE: Readonly<Record<"preserved" | "attention" | "altered", DomainGuidance>> = {
  preserved: {
    actions: [
      "O rastreio cognitivo desta consulta não identificou déficit cognitivo. Na ausência de queixa persistente ou perda funcional, preserve a autonomia e não institua supervisão de medicamentos, finanças ou outras tarefas apenas por causa da idade.",
      "O foco é manutenção da saúde cognitiva: atividade física regular, convívio social, sono adequado, correção de déficits auditivos e visuais e bom controle dos fatores de risco vascular. Reavalie se paciente ou familiar perceber mudança nova e persistente de memória, linguagem, orientação, julgamento ou desempenho nas atividades do dia a dia.",
    ],
    evidenceReferences: [
      {
        label: "LatAm-FINGERS: intervenção multidomínio para prevenção do declínio cognitivo na América Latina",
        pmid: "42442374",
        url: "https://pubmed.ncbi.nlm.nih.gov/42442374/",
        relevance: "Ensaio clínico randomizado latino-americano: intervenção multidomínio em idosos sob risco apoia a promoção de atividade física, alimentação saudável, estímulo cognitivo e controle de fatores vasculares, sem transformar prevenção em tratamento de demência.",
      },
      {
        label: "ACHIEVE: intervenção auditiva e declínio cognitivo",
        pmid: "37478886",
        url: "https://pubmed.ncbi.nlm.nih.gov/37478886/",
        relevance: "Ensaio clínico: o cuidado auditivo é relevante para a saúde e a comunicação; o efeito cognitivo foi mais evidente em participantes com maior risco, sem justificar promessa universal.",
      },
    ],
  },
  attention: {
    actions: [
      "O rastreio cognitivo foi positivo para possível comprometimento cognitivo, mas um rastreio positivo não é diagnóstico de demência. Confirme o achado em avaliação clínica estruturada, considerando escolaridade, relato do paciente e informante, funcionalidade, humor, sono, visão, audição, medicamentos e causas potencialmente reversíveis.",
      "Preserve a autonomia que permanece segura. Ofereça lembretes ou supervisão apenas nas tarefas em que existam erros ou risco observável e organize seguimento para definir se há comprometimento cognitivo, sua repercussão funcional e necessidade de investigação adicional.",
    ],
    evidenceReferences: [{
      label: "Diretriz DETeCD-ADRD para avaliação diagnóstica de suspeita de comprometimento cognitivo",
      pmid: "39713942",
      url: "https://pubmed.ncbi.nlm.nih.gov/39713942/",
      relevance: "Diretriz clínica da Alzheimer's Association: suspeita de comprometimento cognitivo deve seguir avaliação estruturada do estado cognitivo e funcional e do provável processo causal; instrumentos de rastreio não substituem o diagnóstico clínico.",
    }],
  },
  altered: {
    actions: [
      "O rastreio cognitivo foi claramente alterado e aumenta a necessidade de investigação, mas não estabelece sozinho diagnóstico de demência nem sua causa. Faça avaliação clínica e funcional estruturada, com história evolutiva, informante, revisão de humor, sono, visão, audição, medicamentos e causas potencialmente reversíveis, além de exames complementares quando clinicamente indicados.",
      "Se já houver erros em medicamentos, finanças, deslocamentos ou outras tarefas de risco, organize apoio direto nessas atividades sem retirar a participação segura nas demais. Confusão, sonolência ou piora cognitiva de início súbito deve ser tratada como mudança aguda e avaliada prontamente.",
    ],
    evidenceReferences: [{
      label: "Diretriz DETeCD-ADRD para avaliação diagnóstica de suspeita de comprometimento cognitivo",
      pmid: "39713942",
      url: "https://pubmed.ncbi.nlm.nih.gov/39713942/",
      relevance: "Diretriz clínica da Alzheimer's Association: o diagnóstico requer caracterização cognitiva, funcional e etiológica estruturada; resultado de teste cognitivo isolado não define demência.",
    }],
  },
};

const FRAILTY_STATE_FALLBACK_GUIDANCE: Readonly<Record<Exclude<ReportDomainState, "not-assessed">, DomainGuidance>> = {
  preserved: {
    actions: [
      "A avaliação de fragilidade desta consulta não sinalizou vulnerabilidade. Preserve autonomia, atividade física regular, alimentação adequada e participação social; não aplique rotinas de cuidado destinadas a pessoas frágeis apenas por causa da idade.",
      "Reavalie se surgirem perda de peso sem intenção, fadiga persistente, redução de força, quedas ou perda funcional nova.",
    ],
    evidenceReferences: FRAILTY_GUIDANCE.robust.evidenceReferences,
  },
  attention: {
    actions: [
      "A avaliação mostrou sinal de vulnerabilidade ou pré-fragilidade. Esta é uma oportunidade de intervenção precoce: revise atividade física, força e equilíbrio, estado nutricional, quedas, doenças e medicamentos de forma individualizada.",
      "Preserve a independência nas tarefas seguras e acompanhe a evolução; procure a equipe se houver progressão de fadiga, fraqueza, perda de peso, quedas ou dificuldade para levantar e caminhar.",
    ],
    evidenceReferences: FRAILTY_GUIDANCE["pre-frail"].evidenceReferences,
  },
  altered: {
    actions: [
      "A avaliação sinalizou fragilidade ou vulnerabilidade relevante. Organize um plano geriátrico individualizado para identificar causas modificáveis e integrar exercício seguro, nutrição, revisão de medicamentos, prevenção de quedas e suporte funcional.",
      "Apoie as tarefas de maior risco sem retirar toda a autonomia possível e comunique declínio funcional recente, perda de peso, piora da força, quedas ou redução importante da ingestão.",
    ],
    evidenceReferences: FRAILTY_GUIDANCE.frail.evidenceReferences,
  },
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
      "Interprete a fragilidade junto com funcionalidade, força, mobilidade, nutrição, doenças e medicamentos; o resultado isolado não substitui avaliação clínica individualizada.",
      "Avise a equipe se houver perda de peso sem intenção, redução de força, mais dificuldade para levantar ou caminhar, quedas ou cansaço que esteja aumentando.",
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

function frailtyProfileFor(scales: readonly AgaScaleReportSection[]): FrailtyGuidanceProfile | undefined {
  const frail = scales.find((scale) => scale.code === "frail_br" && scale.assessedInTargetConsultation);
  if (!frail) return undefined;

  const score = scoreNumber(frail);
  if (typeof score === "number") {
    const range = FRAIL_BR.ranges.find((item) => score >= item.min && score <= item.max);
    if (range?.classe === "Idoso robusto") return "robust";
    if (range?.classe === "Idoso pré-frágil") return "pre-frail";
    if (range?.classe === "Idoso frágil") return "frail";
  }

  const classification = frail.result.classification ?? "";
  if (/pré[- ]?fr[aá]gil/i.test(classification)) return "pre-frail";
  if (/fr[aá]gil/i.test(classification)) return "frail";
  if (/robusto/i.test(classification)) return "robust";
  return undefined;
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
    const stateAwareGuidance = dimension === "fragilidade"
      ? (() => {
          const profile = frailtyProfileFor(dimensionScales);
          if (profile) return FRAILTY_GUIDANCE[profile];
          return state === "not-assessed" ? undefined : FRAILTY_STATE_FALLBACK_GUIDANCE[state];
        })()
      : dimension === "cognicao" && (state === "preserved" || state === "attention" || state === "altered")
        ? COGNITIVE_SCREEN_GUIDANCE[state]
        : undefined;
    const genericGuidance = unique([
      ...(stateAwareGuidance?.actions ?? alteredIntrinsicGuidance?.actions ?? intrinsicGuidance?.actions ?? domainGuidance?.actions ?? []),
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
      : stateAwareGuidance?.evidenceReferences
        ?? alteredIntrinsicGuidance?.evidenceReferences
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
