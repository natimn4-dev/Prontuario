import { canonicalFastStageLabel } from "./fast-stage.ts";

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
  return canonicalFastStageLabel(score) ?? String(score);
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
      return "Por ter a mobilidade muito limitada e precisar de ajuda até para manter uma posição sentada com segurança, o cuidado deve priorizar conforto, participação no que ainda for possível, transferências assistidas e prevenção das complicações de permanecer muito tempo na mesma posição.";
    }
    return "Por já não conseguir caminhar de forma independente, a pessoa precisa de apoio para se movimentar com segurança. O objetivo é preservar conforto, participação, mobilidade assistida e transferências cuidadosas, sem forçar movimentos que causem dor ou cansaço.";
  }

  return "Como a imobilidade já faz parte do quadro atual, o cuidado deve priorizar posições confortáveis e seguras, participação no que a pessoa ainda consegue fazer, mobilidade assistida, transferências cuidadosas e prevenção das complicações de permanecer muito tempo na mesma posição.";
}

export function establishedImmobilityGuidance(
  context: EstablishedImmobilityContext,
): ContextualFamilyCareGuidance {
  if (!context.established) return { now: [], caregiver: [], contact: [] };

  return {
    now: [
      mobilityOpening(context),
      "Ajude a variar a posição ao longo do dia, na cama e na cadeira, de acordo com o conforto, a condição da pele, a tolerância e a orientação da equipe. Evite deixar o corpo pressionando sempre os mesmos pontos.",
      "Observe a pele todos os dias, principalmente na região do cóccix e das nádegas, quadris, calcanhares, tornozelos, cotovelos e outras áreas de apoio. Mantenha a pele limpa e seca e avise a equipe se surgir vermelhidão que não melhora, bolha, ferida, calor, endurecimento ou dor.",
      "Movimente braços e pernas com delicadeza, dentro do limite confortável e sem forçar as articulações. Converse com o fisioterapeuta sobre movimentos ativos, assistidos ou passivos e sobre o melhor posicionamento para ajudar a preservar a amplitude dos movimentos e reduzir o risco de contraturas.",
    ],
    caregiver: [
      "Antes de mover a pessoa, explique o que será feito e dê tempo para que ela participe do que conseguir. Nas transferências e nos cuidados no leito ou na cadeira, use ajuda suficiente para que o movimento seja seguro e confortável para todos.",
      "Evite puxar a pessoa pelos braços ou tentar sozinho um movimento que pareça pesado ou instável. Deixe espaço livre ao redor da cama, da cadeira e dos locais de transferência para facilitar a aproximação de quem ajuda e dos equipamentos usados no dia a dia.",
    ],
    contact: [
      "Procure a equipe se surgir dor nova durante a movimentação, vermelhidão que não melhora, bolha ou ferida, rigidez que esteja aumentando, piora súbita nas transferências ou mudança importante na mobilidade habitual.",
    ],
  };
}

/**
 * Quando a imobilidade já está estabelecida, a aba Locomoção deve trazer orientações
 * familiares práticas e respeitosas, sem expor códigos de escala no texto compartilhável.
 */
export function contextualizeImmobilityDomainGuidance(
  dimension: string,
  baseGuidance: readonly string[],
  context: EstablishedImmobilityContext | undefined,
): string[] {
  if (!context?.established || (dimension !== "mobilidade" && dimension !== "funcionalidade")) {
    return [...baseGuidance];
  }

  if (dimension === "funcionalidade") {
    return [
      "Como a mobilidade está muito limitada, ofereça ajuda nas atividades e transferências sem retirar a participação da pessoa no que ela ainda consegue fazer. Explique cada cuidado, respeite o tempo dela e priorize conforto e segurança.",
    ];
  }

  return [
    "Como a mobilidade está muito limitada, o objetivo é preservar conforto, segurança e participação no que ainda for possível, sem forçar a marcha ou movimentos que provoquem dor, falta de ar ou cansaço importante.",
    "Ajude a variar a posição ao longo do dia, na cama e na cadeira, conforme conforto, condição da pele, superfície de apoio e tolerância. A frequência deve ser individualizada com a equipe, e não baseada em um horário rígido igual para todas as pessoas.",
    "Observe a pele diariamente nas áreas de maior apoio, como região do cóccix e das nádegas, quadris, calcanhares, tornozelos e cotovelos. Procure a equipe se aparecer vermelhidão persistente, bolha, ferida, endurecimento ou dor.",
    "Movimente braços e pernas com delicadeza, dentro do limite confortável. Converse com o fisioterapeuta sobre movimentos ativos, assistidos ou passivos, posicionamento e outras medidas para preservar a amplitude dos movimentos e reduzir o risco de contraturas.",
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
