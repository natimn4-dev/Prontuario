export const SWALLOWING_SUPPORT_SCHEMA_VERSION = "swallowing-support-v1" as const;

export interface SwallowingSupportContext {
  dysphagia: boolean;
  adaptedDiet: boolean;
  enteralTube: boolean;
  gastrostomy: boolean;
  physicalTherapy?: boolean;
  speechTherapy?: boolean;
  occupationalTherapy?: boolean;
}

export interface StoredSwallowingSupportContext extends SwallowingSupportContext {
  schemaVersion: typeof SWALLOWING_SUPPORT_SCHEMA_VERSION;
  updatedAt: string;
}

export const EMPTY_SWALLOWING_SUPPORT: Readonly<SwallowingSupportContext> = {
  dysphagia: false,
  adaptedDiet: false,
  enteralTube: false,
  gastrostomy: false,
};

function record(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value as Record<string, unknown>;
}

export function normalizeSwallowingSupportContext(value: unknown): SwallowingSupportContext {
  const input = record(value);
  if (!input) throw new Error("Seleção de deglutição e suporte alimentar inválida.");
  const keys = ["dysphagia", "adaptedDiet", "enteralTube", "gastrostomy"] as const;
  if (keys.some((key) => typeof input[key] !== "boolean")) {
    throw new Error("Marque opções válidas de deglutição e suporte alimentar.");
  }
  const therapies = ["physicalTherapy", "speechTherapy", "occupationalTherapy"] as const;
  if (therapies.some((key) => input[key] !== undefined && typeof input[key] !== "boolean")) {
    throw new Error("Marque opções válidas de terapias em andamento.");
  }
  return {
    ...Object.fromEntries(therapies.filter((key) => input[key] !== undefined).map((key) => [key, input[key]])),
    dysphagia: input.dysphagia as boolean,
    adaptedDiet: input.adaptedDiet as boolean,
    enteralTube: input.enteralTube as boolean,
    gastrostomy: input.gastrostomy as boolean,
  };
}

export function mergeStoredSwallowingSupportContext(
  base: Readonly<Record<string, unknown>>,
  value: unknown,
  updatedAt: string,
): Record<string, unknown> {
  return {
    ...base,
    swallowingSupportContext: {
      schemaVersion: SWALLOWING_SUPPORT_SCHEMA_VERSION,
      ...normalizeSwallowingSupportContext(value),
      updatedAt,
    },
  };
}

export function readSwallowingSupportContext(value: unknown): SwallowingSupportContext | undefined {
  const input = record(value);
  if (input?.schemaVersion !== SWALLOWING_SUPPORT_SCHEMA_VERSION) return undefined;
  try {
    return normalizeSwallowingSupportContext(input);
  } catch {
    return undefined;
  }
}

export interface SwallowingSupportGuidance {
  enteralRoute: boolean;
  enteralTube?: boolean;
  gastrostomy?: boolean;
  dysphagia?: boolean;
  speechTherapy?: boolean;
  practicalActions: string[];
  caregiverActions: string[];
  contactGuidance: string[];
}

/** Individualized SLP assessment and caregiver education: https://www.asha.org/practice-portal/clinical-topics/adult-dysphagia/ */
export function speechTherapySwallowingGuidance(inFollowUp?: boolean): string {
  return inFollowUp === true
    ? "Mantenha o acompanhamento com o seu fonoaudiólogo para segurança ao engolir, consistências, ritmo e estratégias nas refeições. Pratique somente os exercícios e as manobras ensinados por esse profissional."
    : "Se ainda não houver acompanhamento com fonoaudiólogo, converse com a equipe sobre uma avaliação da deglutição para orientar uma alimentação mais segura e confortável.";
}

export function hasSwallowingSupport(context: SwallowingSupportContext): boolean {
  return Object.values(context).some(Boolean);
}

/** Family-facing education; it does not set a feeding route, texture, or prescription. */
export function swallowingSupportGuidance(
  context: SwallowingSupportContext,
  options: { includeEnteralCare?: boolean } = {},
): SwallowingSupportGuidance | undefined {
  if (!hasSwallowingSupport(context)) return undefined;

  const practicalActions: string[] = [];
  if (context.physicalTherapy) practicalActions.push("Mantenha a fisioterapia em andamento. Converse com o seu fisioterapeuta sobre apoio do tronco, conforto e posicionamento durante os cuidados e as refeições, conforme as possibilidades da pessoa.");
  if (context.occupationalTherapy) practicalActions.push("Mantenha a terapia ocupacional em andamento. Converse com o seu terapeuta ocupacional sobre utensílios, apoio para as mãos e adaptações que facilitem a participação nas refeições, respeitando as orientações de deglutição.");
  if (context.dysphagia || context.adaptedDiet || context.enteralTube || context.gastrostomy || context.speechTherapy) practicalActions.unshift(speechTherapySwallowingGuidance(context.speechTherapy));
  const caregiverActions: string[] = context.dysphagia || context.adaptedDiet || context.enteralTube || context.gastrostomy
    ? ["Cuide da higiene da boca todos os dias, inclusive quando a alimentação ocorre por sonda."] : [];
  const contactGuidance: string[] = [];

  if (context.dysphagia) {
    practicalActions.push(
      context.enteralTube || context.gastrostomy
        ? "Se a alimentação pela boca estiver liberada no plano atual da equipe, ofereça somente a consistência e a quantidade indicadas, com a pessoa sentada, bem apoiada e no ritmo dela."
        : "Durante a alimentação pela boca, mantenha a pessoa sentada e bem apoiada, respeite o ritmo dela e ofereça pequenas quantidades de cada vez, conforme o plano combinado com a equipe.",
      "Se houver tosse, engasgos, voz molhada ou mudança na respiração durante a alimentação pela boca, interrompa a oferta e avise a equipe, principalmente se o sinal se repetir ou não passar.",
    );
    contactGuidance.push(
      "Avise a equipe se tosse ou engasgos se repetirem durante as refeições, se a voz ficar molhada após engolir ou se houver piora persistente da alimentação.",
    );
  }

  if (context.adaptedDiet) {
    practicalActions.push(
      context.enteralTube || context.gastrostomy
        ? "Se a alimentação pela boca estiver liberada no plano atual, siga a consistência de alimentos e líquidos já orientada. Não mude a textura nem acrescente espessante sem conversar com a equipe que acompanha a deglutição."
        : "Siga a consistência de alimentos e líquidos já orientada para a pessoa. Não mude a textura nem acrescente espessante sem conversar com a equipe que acompanha a deglutição.",
    );
    caregiverActions.push(
      context.enteralTube || context.gastrostomy
        ? "Se houver alimentação pela boca no plano, observe quanto a pessoa aceita, a ingestão de líquidos e o peso. Em algumas pessoas, alimentos com consistência modificada podem reduzir o consumo; conte à equipe se as refeições ficarem incompletas ou houver perda de peso."
        : "Observe quanto a pessoa aceita, a ingestão de líquidos e o peso. Em algumas pessoas, alimentos com consistência modificada podem ser menos atraentes e reduzir o consumo; conte à equipe se as refeições ficarem incompletas ou houver perda de peso.",
    );
    contactGuidance.push(
      context.enteralTube || context.gastrostomy
        ? "Se a alimentação pela boca estiver liberada, converse com a equipe se a pessoa passar a aceitar menos alimentos ou líquidos, tiver perda de peso ou apresentar sinais de desidratação."
        : "Converse com a equipe se a pessoa passar a aceitar menos alimentos ou líquidos, tiver perda de peso ou apresentar sinais de desidratação.",
    );
  }

  if ((context.enteralTube || context.gastrostomy) && options.includeEnteralCare !== false) {
    practicalActions.push(
      "Na dieta enteral pela sonda, confira a fórmula, o volume, a velocidade e os horários do plano individual. Converse com a equipe se não conseguir segui-lo ou precisar de ajustes.",
      "Mantenha o tronco elevado durante e após a dieta pelo tempo orientado; peça ajuda se a orientação não estiver clara ou a posição não for possível.",
    );
    if (context.enteralTube) caregiverActions.push(
      "Na sonda nasoenteral, confira a marca externa e a fixação da sonda como a equipe ensinou; mantenha nariz e boca limpos e observe a pele da narina. A marca não garante, sozinha, a posição correta. Se mudar, a sonda sair ou houver dúvida, suspenda dieta, água e remédios até a equipe confirmar a posição; não reposicione em casa.",
    );
    if (context.gastrostomy) caregiverActions.push(
      "Na gastrostomia, cuide da abertura na barriga (estoma): mantenha limpa e seca e observe vermelhidão persistente, dor, secreção, sangramento ou vazamento. Evite puxar a sonda; não ajuste a fixação, gire a sonda nem mexa no balão sem treinamento específico para o modelo e a fase de cicatrização.",
    );
    caregiverActions.push(
      "Antes de triturar comprimidos, abrir cápsulas ou administrar qualquer medicamento pela sonda, confirme com o médico ou farmacêutico se aquela apresentação pode ser usada dessa forma. Não misture medicamentos à fórmula.",
      "Faça a lavagem da sonda somente conforme o plano individual, inclusive quanto ao volume de água. Se essa orientação não estiver registrada, confirme com a equipe, pois a quantidade pode depender das necessidades clínicas da pessoa.",
    );
    if (context.enteralTube) contactGuidance.push("Na sonda nasoenteral, avise prontamente sobre mudança da marca, saída, obstrução, vazamento ou ferida na narina. Não use a sonda com posição duvidosa.");
    if (context.gastrostomy) contactGuidance.push("Se a gastrostomia deslocar ou sair, pare dieta, água e medicamentos e procure atendimento imediatamente; a abertura pode fechar rapidamente. Não tente recolocar em casa. Dor abdominal intensa, febre ou sangramento importante exigem avaliação urgente.");
    contactGuidance.push("Avise a equipe por tosse persistente ou mudança na respiração durante a dieta, vômitos repetidos, dor ou intolerância. Falta de ar intensa exige atendimento de urgência.");
  }

  return {
    enteralRoute: context.enteralTube || context.gastrostomy,
    enteralTube: context.enteralTube,
    gastrostomy: context.gastrostomy,
    dysphagia: context.dysphagia,
    ...(context.speechTherapy !== undefined ? { speechTherapy: context.speechTherapy } : {}),
    practicalActions: [...new Set(practicalActions)],
    caregiverActions: [...new Set(caregiverActions)],
    contactGuidance: [...new Set(contactGuidance)],
  };
}

export const SWALLOWING_SUPPORT_EVIDENCE = [
  { pmid: "26966356", url: "https://pubmed.ncbi.nlm.nih.gov/26966356/", note: "Revisão de consenso sobre disfagia orofaríngea na pessoa idosa, avaliação individual e riscos de desidratação e desnutrição." },
  { pmid: "33371326", url: "https://pubmed.ncbi.nlm.nih.gov/33371326/", note: "Revisão sistemática e meta-análise sobre ingestão nutricional com dietas de textura modificada." },
  { pmid: "37707775", url: "https://pubmed.ncbi.nlm.nih.gov/37707775/", note: "Revisão sobre segurança de medicamentos em pessoas com disfagia ou alimentação enteral." },
  { pmid: "35007816", url: "https://pubmed.ncbi.nlm.nih.gov/35007816/", note: "Diretriz prática ESPEN para nutrição enteral domiciliar, incluindo administração e monitoramento do cuidado." },
  { pmid: "27815525", url: "https://pubmed.ncbi.nlm.nih.gov/27815525/", note: "Práticas seguras ASPEN para terapia nutricional enteral, com recomendações para prescrição, preparo e administração." },
] as const;
