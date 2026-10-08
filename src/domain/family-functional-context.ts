import type { AgaScaleReportSection } from "./aga-report.ts";
import { canonicalFastStageLabel } from "./fast-stage.ts";

export type FamilyFunctionalCareLevel =
  | "independent"
  | "iadl-support"
  | "adl-support"
  | "high-dependence"
  | "advanced-dementia";

export interface FamilyFunctionalContext {
  level: FamilyFunctionalCareLevel;
  sourceSummary: string;
  fastStage?: string;
  fastScore?: number;
  katzScore?: number;
  barthelScore?: number;
  lawtonScore?: number;
}

const LEVEL_RANK: Record<FamilyFunctionalCareLevel, number> = {
  independent: 0,
  "iadl-support": 1,
  "adl-support": 2,
  "high-dependence": 3,
  "advanced-dementia": 4,
};

function currentScale(scales: readonly AgaScaleReportSection[], code: string): AgaScaleReportSection | undefined {
  return scales.find((scale) => scale.code === code && scale.assessedInTargetConsultation);
}

function maxLevel(current: FamilyFunctionalCareLevel, candidate: FamilyFunctionalCareLevel): FamilyFunctionalCareLevel {
  return LEVEL_RANK[candidate] > LEVEL_RANK[current] ? candidate : current;
}

function fastStageLabel(score: number): string {
  return canonicalFastStageLabel(score) ?? String(score);
}

function fastLevel(score: number): FamilyFunctionalCareLevel {
  if (score >= 7) return "advanced-dementia";
  if (score >= 6) return "high-dependence";
  if (score >= 5) return "adl-support";
  if (score >= 4) return "iadl-support";
  return "independent";
}

function katzLevel(score: number): FamilyFunctionalCareLevel {
  if (score <= 2) return "high-dependence";
  if (score <= 5) return "adl-support";
  return "independent";
}

function barthelLevel(score: number): FamilyFunctionalCareLevel {
  if (score <= 35) return "high-dependence";
  if (score <= 95) return "adl-support";
  return "independent";
}

function lawtonLevel(score: number): FamilyFunctionalCareLevel {
  return score < 21 ? "iadl-support" : "independent";
}

function functionalScaleLevel(context: FamilyFunctionalContext): FamilyFunctionalCareLevel | undefined {
  let level: FamilyFunctionalCareLevel | undefined;
  const add = (candidate: FamilyFunctionalCareLevel) => {
    level = level === undefined ? candidate : maxLevel(level, candidate);
  };

  if (typeof context.katzScore === "number") add(katzLevel(context.katzScore));
  if (typeof context.barthelScore === "number") add(barthelLevel(context.barthelScore));
  if (typeof context.lawtonScore === "number") add(lawtonLevel(context.lawtonScore));
  return level;
}

/**
 * Define o nível de apoio que contextualiza as orientações familiares.
 * FAST contextualiza demência e mobilidade. Katz/Barthel (ABVD) e Lawton (AIVD)
 * permanecem as âncoras específicas da linha Funcionalidade quando foram aplicados.
 *
 * O contexto apenas adapta linguagem e prioridades de cuidado. Não cria diagnóstico,
 * não altera pontuação de escala e não gera prescrição.
 */
export function deriveFamilyFunctionalContext(
  scales: readonly AgaScaleReportSection[],
): FamilyFunctionalContext {
  const fast = currentScale(scales, "fast");
  const katz = currentScale(scales, "katz");
  const barthel = currentScale(scales, "barthel");
  const lawton = currentScale(scales, "lawton");

  const fastScore = fast?.result.score ?? undefined;
  const katzScore = katz?.result.score ?? undefined;
  const barthelScore = barthel?.result.score ?? undefined;
  const lawtonScore = lawton?.result.score ?? undefined;

  let level: FamilyFunctionalCareLevel = "independent";
  const sources: string[] = [];

  if (typeof fastScore === "number") {
    level = maxLevel(level, fastLevel(fastScore));
    sources.push(`FAST ${fastStageLabel(fastScore)}`);
  }
  if (typeof katzScore === "number") {
    level = maxLevel(level, katzLevel(katzScore));
    sources.push(`Katz ${katzScore}`);
  }
  if (typeof barthelScore === "number") {
    level = maxLevel(level, barthelLevel(barthelScore));
    sources.push(`Barthel ${barthelScore}`);
  }
  if (typeof lawtonScore === "number") {
    level = maxLevel(level, lawtonLevel(lawtonScore));
    sources.push(`Lawton ${lawtonScore}`);
  }

  return {
    level,
    sourceSummary: sources.length > 0 ? sources.join(" · ") : "Funcionalidade não estratificada por FAST, Katz, Barthel ou Lawton nesta consulta",
    ...(typeof fastScore === "number" ? { fastScore, fastStage: fastStageLabel(fastScore) } : {}),
    ...(typeof katzScore === "number" ? { katzScore } : {}),
    ...(typeof barthelScore === "number" ? { barthelScore } : {}),
    ...(typeof lawtonScore === "number" ? { lawtonScore } : {}),
  };
}

const ADVANCED_DEMENTIA_GUIDANCE: Readonly<Record<string, readonly string[]>> = {
  funcionalidade: [
    "O estágio funcional mostra necessidade de ajuda muito ampla nas atividades básicas. Organize o cuidado para que banho, vestir-se, higiene, alimentação e transferências aconteçam com conforto, segurança e dignidade, preservando a participação que ainda for possível.",
    "Nas transferências, mudanças de posição, higiene e cuidados no leito ou na cadeira, use ajuda suficiente para que o movimento seja confortável e seguro para a pessoa e para quem cuida.",
    "Observe a pele todos os dias e perceba se alguma posição causa dor ou desconforto. Feridas, vermelhidão que não melhora ou dor nova merecem ser comunicadas à equipe.",
    "Se houver uma mudança súbita no nível de alerta, na interação, na mobilidade ou na forma como a pessoa tolera os cuidados, procure a equipe sem esperar a próxima consulta.",
  ],
  cognicao: [
    "Na demência avançada, uma comunicação calma e afetuosa costuma ajudar mais. Use frases curtas, contato visual e toque quando a pessoa receber bem, observando também expressões, gestos e outros sinais de dor, medo ou desconforto.",
    "Mantenha uma rotina previsível e um ambiente familiar. Em vez de cobrar memória ou orientação, ofereça pistas simples e conduza as atividades no ritmo da pessoa.",
    "Deixe medicamentos, compromissos e outras decisões práticas sob responsabilidade de uma pessoa de confiança, mantendo a pessoa cuidada incluída nas escolhas sempre que isso ainda for possível.",
    "Confusão ou sonolência que apareça de repente, agitação muito diferente do habitual ou redução abrupta da interação merecem avaliação rápida.",
  ],
  mobilidade: [
    "Na demência avançada, a mobilidade deve acompanhar o que a pessoa realmente consegue fazer hoje. Ofereça a ajuda necessária para transferências e deslocamentos, priorizando segurança e conforto.",
    "Mude a posição e faça as mobilizações de forma lenta e cuidadosa. Pare e ajuste se houver dor, falta de ar, cansaço importante ou insegurança para quem está ajudando.",
    "Deixe espaço livre ao redor da cama, cadeira e locais de transferência para facilitar a aproximação de quem ajuda e dos equipamentos usados no dia a dia.",
  ],
  nutricao: [
    "Ofereça alimentos e líquidos com a ajuda necessária para que a refeição aconteça com calma, em boa posição e sem pressa.",
    "Procure a equipe se aparecerem tosse ou engasgos durante as refeições, voz molhada depois de engolir, refeições muito demoradas, recusa persistente ou redução importante da alimentação.",
    "Priorize conforto, ritmo lento e boa aceitação. Se houver desconforto ou dificuldade evidente para engolir, pare a oferta e observe antes de insistir.",
  ],
  fragilidade: [
    "Com dependência avançada, vale concentrar o cuidado no que traz mais conforto e segurança: transferências cuidadosas, proteção da pele, sono, alimentação possível e reconhecimento rápido de mudanças no estado habitual.",
    "Prefira movimentos e atividades compatíveis com a capacidade atual, sem transformar exercício independente em uma obrigação. A meta é preservar conforto, participação e mobilidade possível.",
  ],
  "suporte-social": [
    "Quando houver mais de uma pessoa disponível, dividam as tarefas de cuidado de forma clara para que higiene, alimentação, medicamentos, mudanças de posição e consultas não fiquem concentrados em uma só pessoa.",
    "Reserve momentos de descanso para quem cuida e combine quem pode ajudar nos períodos mais cansativos. Se houver exaustão ou dificuldade para fazer transferências ou higiene com segurança, converse com a equipe.",
    "Nas conversas sobre o cuidado, tragam para o centro o que é mais importante para a pessoa e para a família: conforto, rotina, preferências e prioridades para os próximos passos.",
  ],
  medicamentos: [
    "Escolha uma pessoa de referência para organizar os medicamentos e horários e mantenha uma lista atualizada para levar a consultas, atendimentos de urgência e internações.",
    "Se surgir dúvida ou necessidade de mudar algum medicamento, converse primeiro com a equipe. Procure ajuda se aparecerem sonolência nova, quedas nas transferências, sangramento, hipoglicemia ou dificuldade para administrar os remédios.",
  ],
  sensorial: [
    "Uma voz familiar, iluminação confortável e os recursos de visão ou audição que a pessoa costuma usar podem ajudar no reconhecimento e no bem-estar.",
    "Para perceber bem-estar ou desconforto, observe também expressão facial, postura, vocalizações e mudanças de comportamento, mesmo quando a pessoa fala pouco ou não consegue responder.",
  ],
};

const HIGH_DEPENDENCE_GUIDANCE: Readonly<Record<string, readonly string[]>> = {
  funcionalidade: [
    "Há necessidade importante de ajuda nas atividades básicas. Combine quem poderá apoiar no banho, vestir-se, higiene, alimentação e transferências, mantendo companhia nas situações em que há risco.",
    "Deixe a pessoa participar das etapas que ainda consegue fazer com segurança, sem transformar autonomia em cobrança.",
    "Procure a equipe se a pessoa passar a precisar de muito mais ajuda, sentir dor nas transferências, perder mobilidade ou apresentar feridas ou vermelhidão persistente na pele.",
  ],
  cognicao: [
    "Use instruções curtas e uma etapa por vez. Em medicamentos, finanças e organização de consultas, deixe uma pessoa de confiança acompanhar de perto quando já houver erros ou insegurança.",
    "Mantenha uma rotina previsível e ofereça escolhas simples sempre que possível. Reduza cobranças que estejam trazendo frustração ou ansiedade.",
  ],
  mobilidade: [
    "Nas transferências e ao levantar, fique por perto e ofereça a ajuda necessária. Se caminhar exigir assistência, acompanhe todo o trajeto.",
    "Conte à equipe se houver quedas, quase tombos ou se quem cuida passar a precisar de mais ajuda para movimentar a pessoa.",
  ],
};

const ADL_SUPPORT_GUIDANCE: Readonly<Record<string, readonly string[]>> = {
  funcionalidade: [
    "Identifique em quais atividades a pessoa precisa de ajuda e preserve sua participação nas etapas que ainda consegue fazer com segurança.",
    "Ofereça ajuda sem antecipar tudo o que a pessoa ainda consegue fazer. Nas situações com risco de queda, erro de medicação ou alimentação insegura, fique por perto e participe mais ativamente.",
    "Perceba quais atividades passaram a exigir mais ajuda desde a última consulta e conte essas mudanças na próxima revisão.",
  ],
  cognicao: [
    "Use lembretes e rotina nas tarefas em que isso ainda ajuda. Nas atividades que já apresentam erros repetidos ou risco, ofereça apoio direto de uma pessoa de confiança.",
  ],
};

const IADL_SUPPORT_GUIDANCE: Readonly<Record<string, readonly string[]>> = {
  funcionalidade: [
    "Concentre a ajuda nas atividades instrumentais que ficaram mais difíceis, como finanças, compras, transporte, organização da casa e medicamentos, e preserve a independência nas atividades básicas que continuam seguras.",
    "Aumente a ajuda apenas onde houver dificuldade ou risco e observe se alguma nova tarefa começa a precisar de apoio.",
  ],
  cognicao: [
    "Listas, rotina e calendário podem ajudar nas tarefas complexas. Se já houver erros em finanças, medicamentos ou deslocamentos, combine apoio direto de uma pessoa de confiança em vez de depender apenas de lembretes.",
  ],
};

const DEMENTIA_COGNITION_GUIDANCE: Readonly<Record<string, readonly string[]>> = {
  "4": [
    "Fase leve: esquecimentos, perguntas repetidas e dificuldades em finanças ou compromissos podem surgir, com muitas atividades ainda independentes. A evolução varia; adapte o apoio às necessidades e à avaliação da equipe.",
    "Preserve autonomia, preferências e participação nas decisões. Conversem sobre quem ajudará nas decisões futuras, preferências de cuidado e diretivas antecipadas; busquem orientação sobre procuração e testamento se desejado. A capacidade é avaliada para cada decisão.",
    "Observe segurança ao dirigir, usar fogão e tomar medicamentos. Use calendário, lembretes e caixa de remédios com conferência; ofereça apoio se houver erros. Mantenha atividades e encontros prazerosos e relate mudanças de memória, autonomia, humor, ansiedade ou sono.",
  ],
  "5": [
    "Fase moderada: pode ser necessário apoio para organizar o dia e escolher roupas, com maior desorientação. Preserve a participação; as mudanças e o ritmo de evolução variam.",
    "Fale com calma, contato visual, frases curtas e uma instrução por vez. Ofereça escolhas simples e tempo para responder, sem discutir ou testar a memória. Mantenha rotina tranquila; na agitação ao entardecer, ajuste ruídos e iluminação e observe cansaço, fome e dor.",
    "Retire tapetes soltos e objetos perigosos; proteja medicamentos e fogão e acompanhe saídas se houver risco de se perder. Adapte portas e janelas mantendo saídas seguras em emergência.",
    "Combine apoio em consultas, medicamentos e finanças. Converse sobre capacidade para cada decisão e representação jurídica quando necessária. Dividam tarefas e planejem descanso; cuidador, centro-dia, grupos de apoio e ajuda profissional podem acolher sofrimento ou exaustão.",
  ],
  "6": [
    "Fase moderadamente grave: banho, vestir-se e higiene costumam exigir ajuda; pode haver desorientação e dificuldade de reconhecer pessoas. Mobilidade e comunicação variam: preserve a participação sem cobrar desempenho.",
    "Use tom acolhedor, instruções curtas, uma etapa por vez e escolhas simples; ofereça toque suave quando bem recebido, sem correções repetidas. Supervisione quedas, saídas, fogão, medicamentos e objetos perigosos, mantendo circulação e saídas seguras.",
    "Relate agitação, agressividade, alucinações ou desorientação noturna e o que ajuda. Observe dor, constipação, fome, sono e desconforto; priorize rotina e ambiente antes de discutir medicamentos com a equipe.",
    "Reavaliem cuidador em tempo integral ou instituição de longa permanência conforme necessidades, preferências e recursos, sem culpa. Retomem metas e cuidados paliativos para aliviar sintomas e apoiar a família. Cuidar de quem cuida inclui descanso e apoio emocional.",
  ],
  "7": [
    "Fase grave: há ajuda muito ampla nas atividades, fala limitada e possíveis dificuldades para engolir ou se movimentar. As necessidades variam; este estágio, sozinho, não define os últimos dias de vida.",
    "Use comunicação calma e afetuosa, frases curtas, contato visual e toque bem recebido. Observe expressões, gestos e sinais de dor, medo ou desconforto. Mantenha rotina familiar; em vez de cobrar memória ou orientação, ofereça pistas e respeite o ritmo da pessoa.",
    "Deixe medicamentos, compromissos e decisões práticas com uma pessoa de confiança, incluindo a pessoa nas escolhas possíveis. Confusão ou sonolência súbita, agitação muito diferente ou perda abrupta de interação exigem avaliação rápida.",
    "Priorize conforto e dignidade: cuide de dor, higiene, pele e posicionamento com a equipe. Se houver dificuldade para engolir ou comer menos, discutam benefícios e riscos da alimentação assistida e da sonda, sem indicação automática pela fase da demência; considerem valores e conforto.",
    "Converse sobre cuidados paliativos e serviços de fim de vida quando indicados, respeitando vontades anteriores. Voz familiar, música, presença e toque podem manter o vínculo; respeite cansaço e desconforto. Dividam responsabilidades e busquem descanso, apoio psicológico e grupos de apoio, inclusive no luto antecipatório.",
  ],
};

/** Uses only a valid FAST assessed in this consultation, never an ADL or mood score. */
export function dementiaCognitionGuidance(context: FamilyFunctionalContext): readonly string[] | undefined {
  const stage = canonicalFastStageLabel(context.fastScore);
  return stage ? DEMENTIA_COGNITION_GUIDANCE[stage.charAt(0)] : undefined;
}

/** Educational support bands requested by the clinician; does not reclassify stored results. */
export function functionalScoreGuidance(context: FamilyFunctionalContext): string[] {
  const actions: string[] = [];
  const barthel = context.barthelScore;
  const katzNeedsMoreSupport = typeof context.katzScore === "number"
    && (typeof barthel !== "number" || LEVEL_RANK[katzLevel(context.katzScore)] > LEVEL_RANK[barthelLevel(barthel)]);
  if (katzNeedsMoreSupport) {
    actions.push(...(katzLevel(context.katzScore!) === "high-dependence"
      ? HIGH_DEPENDENCE_GUIDANCE.funcionalidade!
      : katzLevel(context.katzScore!) === "adl-support" ? ADL_SUPPORT_GUIDANCE.funcionalidade! : []));
  } else if (typeof barthel === "number" && Number.isFinite(barthel) && barthel >= 0 && barthel <= 100) {
    if (barthel > 90) actions.push("Atividades básicas: mantenha supervisão discreta e preserve a autonomia, sem assumir tarefas que a pessoa ainda realiza. Observe quedas e dificuldades novas ou progressivas.");
    else if (barthel > 60) actions.push("Atividades básicas: ajude nos momentos necessários, como banho, vestir-se e transferências. Adapte o banheiro com barras de apoio, cadeira de banho e piso antiderrapante; acompanhe transferências e caminhada para prevenir quedas.");
    else if (barthel > 20) actions.push("Há necessidade importante de ajuda nas atividades básicas: banho, vestir-se, higiene, alimentação e transferências. Organize horários para os cuidados e mudanças de posição; proteja a pele e converse sobre cuidador, fisioterapia ou enfermagem domiciliar conforme a necessidade.");
    else actions.push("Atividades básicas: organize apoio familiar ou profissional contínuo para higiene, alimentação e transferências. Cuide da pele, da boca e das perdas de urina e fezes; combine mudanças de posição com a equipe conforme conforto e risco de feridas. Mantenha avaliações regulares e converse sobre cuidados paliativos quando indicados.");
  }
  const lawton = context.lawtonScore;
  if (typeof lawton === "number" && Number.isFinite(lawton) && lawton >= 7 && lawton <= 21) {
    if (lawton === 21) actions.push("Atividades instrumentais: preserve a independência no telefone, compras, refeições, tarefas domésticas, transporte, medicamentos e finanças. Observe esquecimentos ou dificuldades novas nas tarefas habituais.");
    else if (lawton > 7) actions.push("Nas atividades instrumentais, atividades mais complexas como finanças, compras, transporte e medicamentos podem exigir ajuda por perto. Organize e confira os remédios em caixa semanal quando adequada; acompanhe consultas e exames e assuma pagamentos e compras aos poucos, preservando as tarefas ainda seguras.");
    else actions.push("Atividades instrumentais: uma pessoa de confiança deve assumir medicamentos, finanças, compras e transporte, mantendo a participação nas escolhas possíveis. Supervisione fogão, saídas e risco de golpes; perda dessas habilidades, especialmente com mudanças cognitivas, requer avaliação médica para investigar a causa, incluindo demência.");
  }
  if (actions.length) actions.push("Preserve a participação e as escolhas da pessoa: ajude apenas no necessário, sem excesso de cuidado. Avise a equipe se a necessidade de ajuda aumentar; perda funcional súbita exige avaliação rápida.");
  return actions;
}

/**
 * Substitui orientação genérica por orientação coerente com o grau de dependência.
 * Na linha Funcionalidade, Katz/Barthel/Lawton têm precedência quando foram aplicados;
 * FAST é usado como fallback apenas quando não há escala funcional específica na consulta.
 */
export function contextualFamilyGuidance(
  dimension: string,
  baseGuidance: readonly string[],
  context: FamilyFunctionalContext,
): string[] {
  if (dimension === "funcionalidade") {
    const scoreGuidance = functionalScoreGuidance(context);
    if (scoreGuidance.length) return scoreGuidance;
  }
  if (dimension === "cognicao") {
    const dementiaGuidance = dementiaCognitionGuidance(context);
    if (dementiaGuidance) return [...dementiaGuidance];
  }
  const guidanceLevel = dimension === "funcionalidade"
    ? functionalScaleLevel(context) ?? context.level
    : context.level;
  const contextual = guidanceLevel === "advanced-dementia"
    ? ADVANCED_DEMENTIA_GUIDANCE[dimension]
    : guidanceLevel === "high-dependence"
      ? HIGH_DEPENDENCE_GUIDANCE[dimension]
      : guidanceLevel === "adl-support"
        ? ADL_SUPPORT_GUIDANCE[dimension]
        : guidanceLevel === "iadl-support"
          ? IADL_SUPPORT_GUIDANCE[dimension]
          : undefined;

  if (!contextual?.length) return [...baseGuidance];
  return [...contextual];
}
