export const SWALLOWING_SUPPORT_SCHEMA_VERSION = "swallowing-support-v1" as const;

export interface SwallowingSupportContext {
  dysphagia: boolean;
  adaptedDiet: boolean;
  enteralTube: boolean;
  gastrostomy: boolean;
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
  return {
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
  practicalActions: string[];
  caregiverActions: string[];
  contactGuidance: string[];
}

export function hasSwallowingSupport(context: SwallowingSupportContext): boolean {
  return Object.values(context).some(Boolean);
}

/** Family-facing education; it does not set a feeding route, texture, or prescription. */
export function swallowingSupportGuidance(
  context: SwallowingSupportContext,
): SwallowingSupportGuidance | undefined {
  if (!hasSwallowingSupport(context)) return undefined;

  const practicalActions: string[] = [];
  const caregiverActions: string[] = [
    "Cuide da higiene da boca todos os dias, inclusive quando a alimentação ocorre por sonda.",
  ];
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

  if (context.enteralTube || context.gastrostomy) {
    practicalActions.push(
      "Antes de iniciar a dieta enteral pela sonda, confira no plano individual a fórmula, o volume, a velocidade e os horários. Não aumente, reduza nem mude o esquema por conta própria; se não conseguir segui-lo, converse com a equipe.",
      "Durante a dieta, mantenha o tronco elevado conforme a orientação da equipe e pelo período indicado após o término. Se essa orientação não estiver clara ou a posição não for possível, peça ajuda à equipe.",
    );
    caregiverActions.push(
      "Observe se a marca externa e a fixação da sonda permanecem como a equipe ensinou e veja se a pele ao redor da narina está íntegra. Se a sonda sair ou a marca mudar, não a reposicione nem administre dieta ou remédios até receber orientação da equipe.",
      "Antes de triturar comprimidos, abrir cápsulas ou administrar qualquer medicamento pela sonda, confirme com o médico ou farmacêutico se aquela apresentação pode ser usada dessa forma. Não misture medicamentos à fórmula.",
      "Faça a lavagem da sonda somente conforme o plano individual, inclusive quanto ao volume de água. Se essa orientação não estiver registrada, confirme com a equipe, pois a quantidade pode depender das necessidades clínicas da pessoa.",
    );
    contactGuidance.push(
      "Avise a equipe prontamente se a sonda sair, mudar de posição, entupir ou vazar, ou se houver irritação/ferida na narina, tosse persistente ou mudança na respiração durante a dieta, vômitos repetidos, dor ou dificuldade para tolerá-la. Falta de ar intensa exige atendimento de urgência.",
    );
  }

  return {
    enteralRoute: context.enteralTube || context.gastrostomy,
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
