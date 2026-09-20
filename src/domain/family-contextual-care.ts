export interface ContextScaleInput {
  code: string;
  assessedInTargetConsultation: boolean;
  result: { score: number | null };
}

export interface ContextProblemInput {
  title: string;
  status: string;
}

export interface ContextMedicationInput {
  route?: string;
  status?: string;
}

export type ImmobilitySource = "FAST_7C_OR_HIGHER" | "GERIATRIC_PROBLEM";

export interface EstablishedImmobilityContext {
  established: boolean;
  source?: ImmobilitySource;
  fastScore?: number;
  fastStage?: string;
}

export interface ContextualFamilyCareGuidance {
  now: string[];
  caregiver: string[];
  contact: string[];
}

export interface FamilyCarePlanShape {
  now: readonly string[];
  mediumTerm: readonly string[];
  caregiver: readonly string[];
  referrals: readonly string[];
  contact: readonly string[];
  urgent: readonly string[];
}

function normalized(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .replace(/\s+/g, " ")
    .trim();
}

function fastStageLabel(score: number): string {
  const known: Record<string, string> = {
    "7.3": "7c",
    "7.4": "7d",
    "7.5": "7e",
    "7.6": "7f",
  };
  return known[String(score)] ?? String(score);
}

function activeImmobilityProblem(problems: readonly ContextProblemInput[]): boolean {
  return problems.some((problem) =>
    problem.status !== "RESOLVED" && normalized(problem.title) === "imobilidade"
  );
}

/**
 * Regra de precedência do relatório familiar:
 * 1. FAST 7c ou superior define imobilidade associada ao estágio da demência.
 * 2. Na ausência desse gatilho, o problema geriátrico Imobilidade também ativa os mesmos
 *    cuidados práticos, sem inferir ou modificar a classificação FAST.
 */
export function deriveEstablishedImmobilityContext(input: {
  scales: readonly ContextScaleInput[];
  geriatricProblems?: readonly ContextProblemInput[];
}): EstablishedImmobilityContext {
  const fast = input.scales.find((scale) => scale.code === "fast" && scale.assessedInTargetConsultation);
  const fastScore = fast?.result.score ?? undefined;

  if (typeof fastScore === "number" && fastScore >= 7.3) {
    return {
      established: true,
      source: "FAST_7C_OR_HIGHER",
      fastScore,
      fastStage: fastStageLabel(fastScore),
    };
  }

  if (activeImmobilityProblem(input.geriatricProblems ?? [])) {
    return { established: true, source: "GERIATRIC_PROBLEM" };
  }

  return { established: false };
}

function mobilityOpening(context: EstablishedImmobilityContext): string {
  if (context.source === "FAST_7C_OR_HIGHER") {
    if ((context.fastScore ?? 0) >= 7.4) {
      return `O FAST ${context.fastStage ?? "7d"} mostra que a pessoa já não caminha de forma independente e precisa de apoio para permanecer sentada. O cuidado passa a priorizar posições confortáveis e seguras, transferências assistidas e prevenção das complicações da imobilidade.`;
    }
    return "O FAST 7c mostra que a pessoa já não caminha de forma independente. O cuidado passa a priorizar mobilidade assistida, transferências seguras, conforto e prevenção das complicações da imobilidade.";
  }

  return "A imobilidade está registrada como um problema atual. O cuidado passa a priorizar posições confortáveis e seguras, mobilidade assistida, transferências cuidadosas e prevenção das complicações de permanecer muito tempo na mesma posição.";
}

export function establishedImmobilityGuidance(
  context: EstablishedImmobilityContext,
): ContextualFamilyCareGuidance {
  if (!context.established) return { now: [], caregiver: [], contact: [] };

  return {
    now: [
      mobilityOpening(context),
      "Mude a posição e faça as mobilizações devagar, observando como a pessoa reage. Pare e ajuste se houver dor, falta de ar, cansaço importante ou desconforto.",
      "Observe a pele todos os dias, principalmente nas áreas que ficam mais tempo em contato com a cama, a cadeira ou outros apoios.",
    ],
    caregiver: [
      "Nas transferências e nos cuidados no leito ou na cadeira, use ajuda suficiente para que o movimento seja seguro e confortável para a pessoa e para quem cuida. Evite tentar sozinho um movimento que pareça pesado ou instável.",
      "Deixe espaço livre ao redor da cama, da cadeira e dos locais de transferência para facilitar a aproximação de quem ajuda e dos equipamentos usados no dia a dia.",
    ],
    contact: [
      "Procure a equipe se surgir dor nova durante a movimentação, vermelhidão que não melhora, feridas, piora súbita nas transferências ou mudança importante na mobilidade habitual.",
    ],
  };
}

/**
 * A tabela de resultados deve resumir a prioridade sem repetir literalmente o plano de cuidados.
 * Os detalhes operacionais de posicionamento, transferências e prevenção de complicações ficam
 * concentrados no Plano de cuidados e orientações para a família.
 */
export function contextualizeImmobilityDomainGuidance(
  dimension: string,
  baseGuidance: readonly string[],
  context: EstablishedImmobilityContext | undefined,
): string[] {
  if (!context?.established || (dimension !== "mobilidade" && dimension !== "funcionalidade")) {
    return [...baseGuidance];
  }

  const stage = context.source === "FAST_7C_OR_HIGHER"
    ? `FAST ${context.fastStage ?? "7c"}`
    : "imobilidade registrada";
  return [
    `${stage}: a mobilidade está bastante limitada. O cuidado deve priorizar conforto, mudanças de posição, transferências assistidas, proteção da pele e prevenção das complicações da imobilidade.`,
  ];
}

export function hasGastrostomyMedicationRoute(items: readonly ContextMedicationInput[]): boolean {
  return items.some((item) => {
    if (item.status && item.status !== "ACTIVE") return false;
    const route = normalized(item.route ?? "");
    return route === "gtt"
      || route === "via gtt"
      || route.includes("gastrostomia")
      || /\bpeg\b/.test(route);
  });
}

/**
 * Orientações educativas para quem já possui gastrostomia registrada.
 * Não define fórmula, volume, velocidade, oferta hídrica ou preparo específico de medicamentos;
 * esses parâmetros dependem da prescrição e da avaliação individual.
 */
export function gastrostomyFamilyGuidance(): ContextualFamilyCareGuidance {
  return {
    now: [
      "Lave as mãos antes de mexer na gastrostomia, na dieta, na água ou nos medicamentos e mantenha conexões e utensílios limpos.",
      "Use a fórmula, o volume, a velocidade e os horários prescritos para a dieta enteral. Se algo estiver difícil ou precisar mudar, converse com a equipe antes de fazer ajustes.",
      "Durante a dieta, mantenha a pessoa bem posicionada e com a cabeceira elevada. Depois, mantenha essa posição pelo tempo combinado para ajudar a reduzir refluxo e aspiração.",
      "Lave a sonda com água antes e depois da dieta e dos medicamentos, e entre medicamentos diferentes, usando o volume prescrito. Se houver um limite diário de líquidos, conte também essa água no total do dia.",
    ],
    caregiver: [
      "Dê os medicamentos separadamente e não os misture diretamente à fórmula da dieta. Antes de usar um medicamento pela gastrostomia, confirme se aquela apresentação pode ser administrada pela sonda.",
      "Antes de triturar um comprimido ou abrir uma cápsula, confirme se isso pode ser feito. Algumas apresentações perdem a segurança ou o efeito quando são abertas ou trituradas.",
      "Mantenha a pele ao redor do estoma limpa e seca e observe todos os dias se apareceu vermelhidão que não melhora, inchaço, dor, secreção, sangramento ou vazamento.",
      "Se houver resistência para lavar ou usar a sonda, não force. Pare e procure orientação para evitar machucar a pessoa ou danificar a gastrostomia.",
    ],
    contact: [
      "Procure a equipe se houver obstrução persistente, vazamento importante, dor nova, sangramento, secreção, piora da pele ao redor do estoma, vômitos repetidos ou dificuldade para tolerar a dieta.",
      "Se a gastrostomia deslocar ou sair, procure atendimento imediatamente e não tente recolocá-la em casa.",
    ],
  };
}

export function uniqueContextualGuidance(items: readonly string[]): string[] {
  return [...new Set(items.map((item) => item.trim()).filter(Boolean))];
}

const INCOMPATIBLE_IMMOBILITY_PATTERNS: readonly RegExp[] = [
  /\bcaminh(?:ar|ada|adas|amento|amentos)\b/i,
  /\bmarcha\b/i,
  /\bdeambul(?:ar|acao)\b/i,
  /\blevantar[- ]?se\b/i,
  /\blevantar\s+e\s+sentar\b/i,
  /\bagachamento\b/i,
  /\bsubir\s+(?:degrau|degraus|escada|escadas)\b/i,
  /\btreino\s+de\s+forca\b/i,
  /\bexercicios?\s+resistid/i,
  /\bcarga\s+progressiva\b/i,
  /\batividades?.{0,30}\bexijam\s+forca\b/i,
  /\bforca.{0,40}\bmembros\b/i,
  /\bcarregar\s+objetos?\b/i,
  /\bpesar\s+o\s+paciente.{0,100}\bmesma\s+balanca\b/i,
];

function suppressIncompatibleImmobilityAdvice(
  items: readonly string[],
  immobility: EstablishedImmobilityContext,
): string[] {
  if (!immobility.established) return [...items];
  return items.filter((item) => !INCOMPATIBLE_IMMOBILITY_PATTERNS.some((pattern) => pattern.test(normalized(item))));
}

/**
 * Aplica contexto ao plano familiar sem apagar orientações de outros domínios.
 * Em imobilidade estabelecida, remove metas automáticas de marcha/deambulação e também
 * prescrições genéricas de treino resistido ou pesagem que exigiriam transferências incompatíveis
 * com o estado funcional. O plano passa a priorizar mobilização/posicionamento assistidos.
 * Para GTT, acrescenta cuidados de gastrostomia.
 */
export function applyContextualFamilyCarePlan(input: {
  plan: FamilyCarePlanShape;
  immobility: EstablishedImmobilityContext;
  gastrostomyPresent: boolean;
}): FamilyCarePlanShape {
  const immobilityGuidance = establishedImmobilityGuidance(input.immobility);
  const gastrostomyGuidance = input.gastrostomyPresent
    ? gastrostomyFamilyGuidance()
    : { now: [], caregiver: [], contact: [] };

  return {
    now: uniqueContextualGuidance([
      ...immobilityGuidance.now,
      ...gastrostomyGuidance.now,
      ...suppressIncompatibleImmobilityAdvice(input.plan.now, input.immobility),
    ]),
    mediumTerm: suppressIncompatibleImmobilityAdvice(input.plan.mediumTerm, input.immobility),
    caregiver: uniqueContextualGuidance([
      ...immobilityGuidance.caregiver,
      ...gastrostomyGuidance.caregiver,
      ...suppressIncompatibleImmobilityAdvice(input.plan.caregiver, input.immobility),
    ]),
    referrals: [...input.plan.referrals],
    contact: uniqueContextualGuidance([
      ...immobilityGuidance.contact,
      ...gastrostomyGuidance.contact,
      ...input.plan.contact,
    ]),
    urgent: [...input.plan.urgent],
  };
}
