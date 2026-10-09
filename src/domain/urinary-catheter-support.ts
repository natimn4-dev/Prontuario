export const URINARY_CATHETER_SCHEMA_VERSION = "urinary-catheter-support-v1" as const;

export interface UrinaryCatheterContext {
  indwelling: boolean;
  intermittent: boolean;
}
export interface UrinaryCatheterGuidance {
  indwellingActions: string[];
  intermittentActions: string[];
  generalActions: string[];
  contactGuidance: string[];
}
export const EMPTY_URINARY_CATHETER: Readonly<UrinaryCatheterContext> = { indwelling: false, intermittent: false };

export function normalizeUrinaryCatheterContext(value: unknown): UrinaryCatheterContext {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Seleção de sonda vesical inválida.");
  const input = value as Record<string, unknown>;
  if (typeof input.indwelling !== "boolean" || typeof input.intermittent !== "boolean") throw new Error("Marque opções válidas de sonda vesical.");
  return { indwelling: input.indwelling, intermittent: input.intermittent };
}
export function mergeStoredUrinaryCatheterContext(base: Readonly<Record<string, unknown>>, value: unknown, updatedAt: string): Record<string, unknown> {
  return { ...base, urinaryCatheterContext: { schemaVersion: URINARY_CATHETER_SCHEMA_VERSION, ...normalizeUrinaryCatheterContext(value), updatedAt } };
}
export function readUrinaryCatheterContext(value: unknown): UrinaryCatheterContext | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value) || (value as Record<string, unknown>).schemaVersion !== URINARY_CATHETER_SCHEMA_VERSION) return undefined;
  try { return normalizeUrinaryCatheterContext(value); } catch { return undefined; }
}

/** Family education only; insertion, exchanges and schedules require an individualized care plan and training. */
export function urinaryCatheterGuidance(context?: UrinaryCatheterContext): UrinaryCatheterGuidance | undefined {
  if (!context?.indwelling && !context?.intermittent) return undefined;
  return {
    indwellingActions: context.indwelling ? [
      "A sonda de demora permanece conectada à bolsa coletora. Lave as mãos antes e depois de manusear o sistema; faça a higiene genital diária e da entrada da sonda com água e sabão neutro, sem álcool ou produtos adstringentes na pele e mucosas.",
      "Mantenha a bolsa abaixo da bexiga, inclusive no transporte, e nunca no chão. Evite dobras no tubo e fixe a sonda na perna ou no abdome como ensinado, sem tração ou puxões.",
      "Esvazie a bolsa quando estiver pela metade, em recipiente limpo e exclusivo, sem encostar a saída da bolsa no recipiente. Mantenha o sistema fechado, sem desconexões desnecessárias.",
      "Trocas da sonda e da bolsa seguem a avaliação da equipe, o modelo e as instruções do fabricante; não há intervalo único para todos. A troca da sonda cabe à equipe treinada. Para bolsa de perna ou noturna, siga o treinamento específico; não desconecte por conta própria. Se houver desconexão ou vazamento no sistema, avise a equipe para avaliar a substituição segura.",
    ] : [],
    intermittentActions: context.intermittent ? [
      "A sonda de alívio é inserida para esvaziar a bexiga e retirada após cada uso. Faça o procedimento somente após treinamento, lavando as mãos antes e depois e limpando a região genital, usando a técnica limpa domiciliar ensinada; luvas estéreis não são exigidas nessa técnica.",
      "Use a sonda e o lubrificante próprios conforme o modelo e o treinamento. Siga os horários e a frequência definidos pela equipe conforme os volumes de urina e a rotina; não adote um número fixo de vezes ao dia por conta própria.",
      "Não force a passagem: pare se houver resistência, dor ou sangramento e procure orientação. Descarte a sonda de uso único após cada uso; só reutilize um modelo apropriado se a equipe orientar expressamente a limpeza e o armazenamento.",
    ] : [],
    generalActions: [
      "Observe diariamente a quantidade, a cor e o cheiro da urina, sangue, vazamento e redução da drenagem, além de febre, calafrios e dor na bexiga ou nas costas. Urina turva ou odor forte, isoladamente, não confirmam infecção; comunique mudanças persistentes à equipe.",
      "Mudança súbita de consciência ou comportamento, sobretudo em idosos, exige avaliação rápida e pode ter várias causas; não atribua automaticamente à infecção urinária.",
      "Ofereça líquidos conforme o plano individual, respeitando restrições médicas, e cuide do funcionamento intestinal: a constipação pode atrapalhar a drenagem. Converse com a equipe sobre dificuldades no manuseio, dúvidas e impacto emocional.",
    ],
    contactGuidance: [
      "Procure atendimento prontamente por febre, calafrios, sangue na urina ou dor na bexiga ou nas costas; odor forte ou urina turva acompanhados desses sinais também exigem avaliação.",
      ...(context.indwelling ? ["Ausência de drenagem, suspeita de obstrução, saída da sonda ou dor intensa exigem atendimento imediato. Confira apenas se o tubo está dobrado e se a bolsa está abaixo da bexiga; não lave, force ou recoloque a sonda em casa. Avise a equipe sobre vazamento ao redor da sonda."] : []),
      ...(context.intermittent ? ["Sangramento importante, dificuldade persistente para inserir a sonda ou incapacidade de esvaziar a bexiga exigem atendimento imediato; não faça novas tentativas forçadas."] : []),
    ],
  };
}

export const URINARY_CATHETER_EVIDENCE = [
  "https://www.cdc.gov/infection-control/hcp/cauti/summary-of-recommendations.html",
  "https://www.idsociety.org/practice-guideline/asymptomatic-bacteriuria/",
  "https://www.nhs.uk/tests-and-treatments/urinary-catheters/living-with/",
  "https://www.gloshospitals.nhs.uk/your-visit/patient-information-leaflets/intermittent-self-catheterisation-isc-adults/",
] as const;
