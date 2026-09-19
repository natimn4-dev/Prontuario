export const NPI_STRUCTURED_CODE = "npi" as const;
export const NPI_STRUCTURED_VERSION = "npi-10-domain-2026-09-v1" as const;

const FREQUENCY_CHOICES = [
  { value: 0, label: "Ausente — 0" },
  { value: 1, label: "Ocasional — 1" },
  { value: 2, label: "Às vezes — 2" },
  { value: 3, label: "Frequente — 3" },
  { value: 4, label: "Muito frequente — 4" },
] as const;

const SEVERITY_CHOICES = [
  { value: 0, label: "Ausente — 0" },
  { value: 1, label: "Leve — 1" },
  { value: 2, label: "Moderada — 2" },
  { value: 3, label: "Acentuada — 3" },
] as const;

export const NPI_DOMAIN_DEFINITIONS = [
  { key: "delusions", label: "Delírios" },
  { key: "hallucinations", label: "Alucinações" },
  { key: "dysphoria", label: "Disforia / depressão" },
  { key: "anxiety", label: "Ansiedade" },
  { key: "agitation", label: "Agitação / agressividade" },
  { key: "euphoria", label: "Euforia" },
  { key: "disinhibition", label: "Desinibição" },
  { key: "irritability", label: "Irritabilidade / labilidade" },
  { key: "apathy", label: "Apatia / indiferença" },
  { key: "aberrant_motor", label: "Atividade motora aberrante" },
] as const;

const fields = NPI_DOMAIN_DEFINITIONS.flatMap((domain) => [
  {
    id: `npi_${domain.key}_frequency`,
    label: `${domain.label} — frequência`,
    choices: FREQUENCY_CHOICES,
  },
  {
    id: `npi_${domain.key}_severity`,
    label: `${domain.label} — gravidade`,
    choices: SEVERITY_CHOICES,
  },
]);

export const NPI_STRUCTURED_DEFINITION = {
  code: NPI_STRUCTURED_CODE,
  version: NPI_STRUCTURED_VERSION,
  name: "NPI — Inventário Neuropsiquiátrico",
  dimension: "cognicao",
  instruction: "Registre frequência e gravidade de cada domínio após aplicar o NPI por meio autorizado. Esta tela registra os escores por domínio e não reproduz as perguntas do instrumento.",
  applicationGuide: [
    {
      title: "Registro",
      items: [
        "Frequência: 0 a 4. Gravidade: 0 a 3.",
        "Domínio ausente deve ter frequência 0 e gravidade 0; resultados discordantes não são salvos.",
      ],
    },
    {
      title: "Interpretação",
      items: [
        "O escore de cada domínio é frequência × gravidade; a soma dos 10 domínios varia de 0 a 120.",
        "Qualquer domínio com frequência e gravidade acima de zero é registrado como sintoma neuropsiquiátrico presente.",
        "O NPI descreve sintomas e carga comportamental; o total não é usado como corte diagnóstico automático.",
      ],
    },
  ],
  sourceNote: "Inventário Neuropsiquiátrico (NPI); versão brasileira com confiabilidade demonstrada por Camozzato et al. (PMID 18257965). O prontuário registra frequência e gravidade após aplicação autorizada.",
  fields,
} as const;

function numericAnswer(raw: Record<string, unknown>, id: string, allowed: readonly number[]): number {
  const value = raw[id];
  if (typeof value !== "number" || !allowed.includes(value)) throw new Error(`NPI inválido: ${id}.`);
  return value;
}

export function scoreNpiStructured(raw: Record<string, unknown>) {
  const allowed = new Set(fields.map((field) => field.id));
  if (Object.keys(raw).some((key) => !allowed.has(key))) throw new Error("NPI inválido: campo não permitido.");

  const answers: Record<string, number> = {};
  const positiveDomains: string[] = [];
  let total = 0;

  for (const domain of NPI_DOMAIN_DEFINITIONS) {
    const frequencyId = `npi_${domain.key}_frequency`;
    const severityId = `npi_${domain.key}_severity`;
    const frequency = numericAnswer(raw, frequencyId, [0, 1, 2, 3, 4]);
    const severity = numericAnswer(raw, severityId, [0, 1, 2, 3]);

    if ((frequency === 0) !== (severity === 0)) {
      throw new Error(`NPI inválido em ${domain.label}: frequência e gravidade devem ser ambas zero quando o domínio estiver ausente.`);
    }

    answers[frequencyId] = frequency;
    answers[severityId] = severity;
    const domainScore = frequency * severity;
    total += domainScore;
    if (domainScore > 0) positiveDomains.push(domain.label);
  }

  const positiveCount = positiveDomains.length;
  return {
    answers,
    version: NPI_STRUCTURED_VERSION,
    result: {
      score: total,
      scoreText: `NPI ${total}/120 · ${positiveCount} domínio(s) positivo(s)`,
      classification: positiveCount === 0
        ? "Sem sintomas neuropsiquiátricos registrados no NPI"
        : `Sintomas neuropsiquiátricos presentes em ${positiveCount} domínio(s)`,
      interpretation: positiveCount === 0
        ? "Nenhum dos dez domínios do NPI foi registrado como presente nesta aplicação."
        : `Domínios positivos: ${positiveDomains.join(", ")}. O NPI quantifica sintomas neuropsiquiátricos; o total não define diagnóstico nem gravidade global por um corte universal.`,
      clinicalColor: positiveCount === 0 ? "verde" as const : "amarelo" as const,
    },
  };
}
