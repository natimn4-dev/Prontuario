export const FREITAS_SCALE_SOURCE = "Freitas e Py — Apêndice: Instrumentos de Avaliação" as const;
export const KATZ_FREITAS_VERSION = "freitas-py-katz-2026-08-v1" as const;
export const LAWTON_FREITAS_VERSION = "freitas-py-lawton-2026-08-v1" as const;
export const GDS15_FREITAS_VERSION = "freitas-py-gds15-2026-08-v1" as const;

export type CoreFreitasScaleCode = "katz" | "lawton" | "gds15";
export type ScaleChoice = { value: number; label: string };
export type ScaleQuestion = { id: string; label: string; choices: readonly ScaleChoice[] };
export type CoreScaleDefinition = {
  code: CoreFreitasScaleCode;
  version: string;
  name: string;
  dimension: "funcionalidade" | "humor";
  instruction: string;
  questions: readonly ScaleQuestion[];
};
export type CoreScaleResult = {
  score: number;
  scoreText: string;
  classification: string;
  interpretation: string;
  clinicalColor?: "green" | "yellow" | "red";
};

const binary = (independentLabel: string, dependentLabel: string): readonly ScaleChoice[] => [
  { value: 1, label: independentLabel },
  { value: 0, label: dependentLabel },
];

export const KATZ_FREITAS: CoreScaleDefinition = {
  code: "katz",
  version: KATZ_FREITAS_VERSION,
  name: "ABVD — Katz (Freitas/Py)",
  dimension: "funcionalidade",
  instruction: "Registre o desempenho habitual em cada uma das seis funções. A pontuação preserva cada função separadamente; não cria categorias globais de gravidade.",
  questions: [
    { id: "bath", label: "Banho", choices: binary("Independente — sem ajuda ou ajuda somente para uma parte do corpo", "Dependente — ajuda em mais de uma parte do corpo ou não toma banho sozinho") },
    { id: "dress", label: "Vestir-se", choices: binary("Independente — veste-se sem ajuda; amarrar sapatos pode ser exceção", "Dependente — precisa de ajuda para pegar roupas ou vestir-se") },
    { id: "toilet", label: "Uso do vaso sanitário", choices: binary("Independente — vai, realiza higiene e ajeita roupas sem ajuda", "Dependente — precisa de ajuda ou não utiliza o banheiro de forma independente") },
    { id: "transfer", label: "Transferências", choices: binary("Independente — entra/sai da cama e senta/levanta da cadeira sem ajuda; pode usar dispositivo", "Dependente — necessita ajuda humana ou não sai da cama") },
    { id: "continence", label: "Continência", choices: binary("Independente — controla inteiramente micção e evacuação", "Dependente — acidentes, ajuda para controle, cateter ou incontinência") },
    { id: "feeding", label: "Alimentação", choices: binary("Independente — alimenta-se sem ajuda; ajuda para cortar carne/passar manteiga é permitida", "Dependente — necessita ajuda para alimentar-se ou alimentação assistida") },
  ],
};

export const LAWTON_FREITAS: CoreScaleDefinition = {
  code: "lawton",
  version: LAWTON_FREITAS_VERSION,
  name: "AIVD — Lawton (Freitas/Py)",
  dimension: "funcionalidade",
  instruction: "Pontue o desempenho descrito em cada atividade. Cada item recebe 1, 2 ou 3 pontos; total de 7 a 21, com maior pontuação indicando maior independência.",
  questions: [
    { id: "phone", label: "Uso do telefone", choices: [
      { value: 3, label: "Vê os números, disca, recebe e faz ligações sem ajuda" },
      { value: 2, label: "Responde ao telefone, mas necessita aparelho especial ou ajuda para localizar/discar números" },
      { value: 1, label: "Completamente incapaz de usar o telefone" },
    ] },
    { id: "travel", label: "Viagens/transporte", choices: [
      { value: 3, label: "Dirige o próprio carro ou viaja sozinho de ônibus ou táxi" },
      { value: 2, label: "Viaja exclusivamente acompanhado" },
      { value: 1, label: "Completamente incapaz de viajar" },
    ] },
    { id: "shopping", label: "Compras", choices: [
      { value: 3, label: "Faz compras se o transporte for fornecido" },
      { value: 2, label: "Faz compras exclusivamente acompanhado" },
      { value: 1, label: "Completamente incapaz de fazer compras" },
    ] },
    { id: "meals", label: "Preparo de refeições", choices: [
      { value: 3, label: "Planeja e cozinha refeições completas" },
      { value: 2, label: "Prepara pequenas refeições, mas não refeições completas sozinho" },
      { value: 1, label: "Completamente incapaz de preparar qualquer refeição" },
    ] },
    { id: "housework", label: "Trabalho doméstico", choices: [
      { value: 3, label: "Realiza trabalho doméstico pesado" },
      { value: 2, label: "Realiza trabalho leve, mas necessita ajuda nas tarefas pesadas" },
      { value: 1, label: "Completamente incapaz de realizar trabalho doméstico" },
    ] },
    { id: "medications", label: "Medicações", choices: [
      { value: 3, label: "Toma os medicamentos na dose certa e na hora certa" },
      { value: 2, label: "Toma os medicamentos com lembretes ou quando outra pessoa os prepara" },
      { value: 1, label: "Completamente incapaz de tomar os medicamentos sozinho" },
    ] },
    { id: "money", label: "Dinheiro/finanças", choices: [
      { value: 3, label: "Administra compras, cheques e pagamento de contas" },
      { value: 2, label: "Administra compras diárias, mas necessita ajuda com cheques e contas" },
      { value: 1, label: "Completamente incapaz de administrar dinheiro" },
    ] },
  ],
};

const gdsLabels = [
  "Está basicamente satisfeito(a) com sua vida?",
  "Deixou muitos de seus interesses e atividades?",
  "Sente que sua vida está vazia?",
  "Aborrece-se com frequência?",
  "Sente-se de bom humor na maior parte do tempo?",
  "Tem medo de que algum mal vá lhe acontecer?",
  "Sente-se feliz na maior parte do tempo?",
  "Sente que sua situação não tem saída?",
  "Prefere ficar em casa a sair e fazer coisas novas?",
  "Sente ter mais problemas de memória do que a maioria?",
  "Acha maravilhoso estar vivo(a)?",
  "Sente-se inútil nas atuais circunstâncias?",
  "Sente-se cheio(a) de energia?",
  "Acha que sua situação é sem esperança?",
  "Sente que a maioria das pessoas está melhor que você?",
] as const;
const gdsPositiveAnswer = ["no", "yes", "yes", "yes", "no", "yes", "no", "yes", "yes", "yes", "no", "yes", "no", "yes", "yes"] as const;

export const GDS15_FREITAS: CoreScaleDefinition = {
  code: "gds15",
  version: GDS15_FREITAS_VERSION,
  name: "GDS-15 — Escala de Depressão Geriátrica",
  dimension: "humor",
  instruction: "Aplicar as 15 perguntas com resposta Sim/Não. É instrumento de rastreio e não estabelece diagnóstico de depressão.",
  questions: gdsLabels.map((label, index) => ({
    id: `g${index + 1}`,
    label,
    choices: [
      { value: gdsPositiveAnswer[index] === "yes" ? 1 : 0, label: "Sim" },
      { value: gdsPositiveAnswer[index] === "no" ? 1 : 0, label: "Não" },
    ],
  })),
};

export const CORE_FREITAS_SCALES = [KATZ_FREITAS, LAWTON_FREITAS, GDS15_FREITAS] as const;

export const FREITAS_SCALE_MIGRATION_INVENTORY = [
  { name: "Avaliação funcional breve", status: "review-required", note: "Instrumento documental identificado; preparar versão própria antes da aplicação estruturada." },
  { name: "MNA completa", status: "migration-required", note: "Não equivale à MNA-SF legada; BMI exatamente 23 permanece ambíguo no material e não será inferido." },
  { name: "Pfeffer — 10 itens", status: "migration-required", note: "Não reutilizar a versão legada de 11 itens." },
  { name: "SPPB", status: "migration-required", note: "Persistir tempos brutos e subescores na nova versão." },
  { name: "POMA", status: "migration-required", note: "Estruturar equilíbrio e marcha sem substituir a versão por outro instrumento." },
  { name: "Mini-Cog", status: "review-required", note: "Forma presente; automatização depende de definição versionada completa." },
  { name: "MEEM", status: "review-required", note: "Formulário presente; cortes por escolaridade exigem governança separada." },
  { name: "Desenho do relógio", status: "review-required", note: "Registro documental até definição de sistema de pontuação versionado." },
  { name: "MoCA — versão experimental brasileira", status: "migration-required", note: "Versão específica; não comparar diretamente com legado incompatível." },
  { name: "IQCODE-Br", status: "review-required", note: "Forma presente; engine versionada ainda pendente." },
  { name: "CES-D", status: "review-required", note: "Forma presente; classificação automatizada ainda pendente." },
  { name: "MOS-SSS", status: "review-required", note: "Forma presente; engine versionada ainda pendente." },
  { name: "APGAR familiar", status: "review-required", note: "Itens presentes; faixas precisam de fonte complementar explícita quando não definidas no apêndice." },
  { name: "Zarit — 22 itens", status: "review-required", note: "Não substituir por Zarit reduzida/paliativa do legado." },
] as const;

function exactAnswers(definition: CoreScaleDefinition, answers: Record<string, unknown>): Record<string, number> {
  const allowedIds = new Set(definition.questions.map((question) => question.id));
  const unexpected = Object.keys(answers).filter((key) => !allowedIds.has(key));
  if (unexpected.length > 0) throw new Error(`Resposta não permitida para ${definition.code}.`);
  const normalized: Record<string, number> = {};
  for (const question of definition.questions) {
    const value = answers[question.id];
    if (typeof value !== "number" || !question.choices.some((choice) => choice.value === value)) {
      throw new Error(`Resposta obrigatória inválida: ${question.id}.`);
    }
    normalized[question.id] = value;
  }
  return normalized;
}

export function scoreCoreFreitasScale(code: CoreFreitasScaleCode, rawAnswers: Record<string, unknown>): { answers: Record<string, number>; result: CoreScaleResult; version: string } {
  const definition = CORE_FREITAS_SCALES.find((item) => item.code === code);
  if (!definition) throw new Error("Escala Freitas/Py não liberada para aplicação estruturada.");
  const answers = exactAnswers(definition, rawAnswers);
  const score = Object.values(answers).reduce((sum, value) => sum + value, 0);

  if (code === "katz") {
    const dependent = 6 - score;
    return { answers, version: definition.version, result: {
      score,
      scoreText: `${score}/6`,
      classification: score === 6 ? "Independente nas 6 ABVD" : score === 0 ? "Dependente nas 6 ABVD" : `Dependência em ${dependent} de 6 ABVD`,
      interpretation: score === 6 ? "Independência registrada em todas as seis funções." : `${dependent} função(ões) com dependência registrada; revisar cada item individualmente.`,
    } };
  }

  if (code === "lawton") {
    return { answers, version: definition.version, result: {
      score,
      scoreText: `${score}/21`,
      classification: score === 21 ? "Independente nas 7 AIVD" : score === 7 ? "Dependente nas 7 AIVD" : "Necessita apoio em uma ou mais AIVD",
      interpretation: "Maior pontuação representa maior independência; revisar os sete itens para localizar as necessidades de ajuda.",
    } };
  }

  const classification = score <= 5 ? "Rastreio não positivo" : score <= 10 ? "Sugestivo de depressão" : "Rastreio fortemente positivo";
  return { answers, version: definition.version, result: {
    score,
    scoreText: `${score}/15`,
    classification,
    interpretation: score <= 5 ? "Sem rastreio positivo pela GDS-15." : "Resultado de rastreio; requer avaliação clínica e não equivale a diagnóstico de depressão.",
    clinicalColor: score <= 5 ? "green" : score <= 10 ? "yellow" : "red",
  } };
}
