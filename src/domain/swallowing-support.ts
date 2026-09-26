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
      "Durante a alimentação pela boca, mantenha a pessoa sentada e bem apoiada, respeite o ritmo dela e ofereça pequenas quantidades de cada vez, conforme o plano combinado com a equipe.",
      "Se houver tosse, engasgos, voz molhada ou mudança na respiração durante a refeição, pause a oferta e converse com a equipe sobre o que aconteceu.",
    );
    contactGuidance.push(
      "Avise a equipe se tosse ou engasgos se repetirem durante as refeições, se a voz ficar molhada após engolir ou se houver piora persistente da alimentação.",
    );
  }

  if (context.adaptedDiet) {
    practicalActions.push(
      "Siga a consistência de alimentos e líquidos já orientada para a pessoa. Não mude a textura nem acrescente espessante sem conversar com a equipe que acompanha a deglutição.",
    );
    caregiverActions.push(
      "Observe quanto a pessoa aceita, a ingestão de líquidos e o peso. Em algumas pessoas, alimentos com consistência modificada podem ser menos atraentes e reduzir o consumo; conte à equipe se as refeições ficarem incompletas ou houver perda de peso.",
    );
    contactGuidance.push(
      "Converse com a equipe se a pessoa passar a aceitar menos alimentos ou líquidos, tiver perda de peso ou apresentar sinais de desidratação.",
    );
  }

  if (context.enteralTube || context.gastrostomy) {
    practicalActions.push(
      "Use a dieta enteral pela sonda conforme o plano da equipe, incluindo fórmula, volume, velocidade e horários. Se algo estiver difícil, converse com a equipe antes de mudar esses cuidados.",
    );
    caregiverActions.push(
      "Antes de triturar comprimidos, abrir cápsulas ou administrar medicamentos pela sonda, confirme com o médico ou farmacêutico se aquela apresentação pode ser usada dessa forma.",
    );
    contactGuidance.push(
      "Procure orientação se a sonda entupir ou se houver vômitos repetidos, dor, vazamento, dificuldade para tolerar a dieta ou piora clínica.",
    );
  }

  return {
    practicalActions: [...new Set(practicalActions)],
    caregiverActions: [...new Set(caregiverActions)],
    contactGuidance: [...new Set(contactGuidance)],
  };
}

export const SWALLOWING_SUPPORT_EVIDENCE = [
  { pmid: "26966356", url: "https://pubmed.ncbi.nlm.nih.gov/26966356/", note: "Revisão de consenso sobre disfagia orofaríngea na pessoa idosa, avaliação individual e riscos de desidratação e desnutrição." },
  { pmid: "33371326", url: "https://pubmed.ncbi.nlm.nih.gov/33371326/", note: "Revisão sistemática e meta-análise sobre ingestão nutricional com dietas de textura modificada." },
  { pmid: "37707775", url: "https://pubmed.ncbi.nlm.nih.gov/37707775/", note: "Revisão sobre segurança de medicamentos em pessoas com disfagia ou alimentação enteral." },
] as const;
