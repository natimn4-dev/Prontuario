import type { ValidatedScaleQuestion, ValidatedScaleResult } from "./freitas-validated-scales.ts";

export type CognitiveFreitasScaleCode = "minicog_freitas" | "meem_freitas" | "clock_shulman" | "moca_br_freitas" | "verbal_fluency_animals" | "iqcode_br_26";

type CognitiveScaleDefinition = {
  code: CognitiveFreitasScaleCode;
  version: string;
  name: string;
  dimension: "cognicao";
  instruction: string;
  sourceNote: string;
  questions: readonly ValidatedScaleQuestion[];
};

const choice = (value: number, label: string) => ({ value, label });
const numeric = (min: number, max: number, step = 1, help?: string) => ({ min, max, step, help });

export const MINICOG_FREITAS: CognitiveScaleDefinition = {
  code: "minicog_freitas",
  version: "freitas-py-minicog-standard-2026-08-v1",
  name: "Mini-Cog",
  dimension: "cognicao",
  instruction: "Aplicar recordação de três palavras e desenho do relógio conforme formulário Freitas/Py. Registre quantas palavras foram evocadas sem pista e se o relógio está normal ou alterado segundo o método Mini-Cog.",
  sourceNote: "Freitas/Py para o instrumento; Mini-Cog oficial/Borson para pontuação 0–5: recordação 0–3 + relógio 0 ou 2, com 0–2 como rastreio positivo e 3–5 como rastreio negativo.",
  questions: [
    { id: "recall", label: "Palavras evocadas sem pista", number: numeric(0, 3, 1, "Informe 0, 1, 2 ou 3 palavras corretamente evocadas.") },
    { id: "clock", label: "Desenho do relógio no Mini-Cog", choices: [choice(0, "Alterado"), choice(2, "Normal")] },
  ],
};

const educationChoices = [
  choice(0, "Analfabeto / sem escolaridade formal"),
  choice(1, "1 a 4 anos"),
  choice(5, "5 a 8 anos"),
  choice(9, "9 a 11 anos"),
  choice(12, "12 anos ou mais"),
] as const;

export const MEEM_FREITAS: CognitiveScaleDefinition = {
  code: "meem_freitas",
  version: "freitas-py-meem-brucki-2026-09-v2",
  name: "MEEM — Miniexame do Estado Mental",
  dimension: "cognicao",
  instruction: "Aplicar os itens do formulário autorizado e registrar cada subtotal cognitivo. O servidor soma 0–30. A escolaridade é registrada separadamente e modifica a interpretação de referência, sem alterar matematicamente o escore bruto.",
  sourceNote: "Estrutura de pontuação do MEEM/MMSE por subtotais; Brucki et al. 2003 para referências educacionais brasileiras (medianas normativas, não pontos diagnósticos). A reprodução eletrônica detalhada permanece condicionada à licença/permissão aplicável configurada no prontuário.",
  questions: [
    { id: "time", label: "Orientação temporal", number: numeric(0, 5) },
    { id: "place", label: "Orientação espacial", number: numeric(0, 5) },
    { id: "registration", label: "Registro imediato", number: numeric(0, 3) },
    { id: "attention", label: "Cálculo ou palavra / atenção", number: numeric(0, 5) },
    { id: "recall", label: "Memória recente / evocação", number: numeric(0, 3) },
    { id: "naming", label: "Nomeação", number: numeric(0, 2) },
    { id: "repetition", label: "Repetição", number: numeric(0, 1) },
    { id: "writing", label: "Escrever uma frase", number: numeric(0, 1) },
    { id: "commands", label: "Comandos em três etapas", number: numeric(0, 3) },
    { id: "reading", label: "Ler e executar", number: numeric(0, 1) },
    { id: "diagram_copy", label: "Copiar diagrama", number: numeric(0, 1) },
    { id: "education", label: "Escolaridade para referência interpretativa", choices: educationChoices },
  ],
};

export const CLOCK_SHULMAN: CognitiveScaleDefinition = {
  code: "clock_shulman",
  version: "clock-shulman-0-5-br-2026-08-v1",
  name: "Teste do desenho do relógio — Shulman 0–5",
  dimension: "cognicao",
  instruction: "Aplicar o desenho do relógio conforme a máscara disponível e classificar o desenho pela escala Shulman de 0 a 5. Esta versão é separada do relógio usado no Mini-Cog e do item do MoCA.",
  sourceNote: "Fuzikawa et al. (Bambuí) validaram a confiabilidade do método Shulman em idosos brasileiros: 4–5 normal e 0–3 alterado.",
  questions: [
    { id: "score", label: "Pontuação Shulman", choices: [
      choice(0, "0 — Não representa um relógio razoável"),
      choice(1, "1 — Desorganização visuoespacial grave"),
      choice(2, "2 — Desorganização visuoespacial moderada que impede indicar o horário"),
      choice(3, "3 — Organização visuoespacial preservada, porém horário incorreto"),
      choice(4, "4 — Pequenos erros visuoespaciais"),
      choice(5, "5 — Relógio correto"),
    ] },
  ],
};

export const MOCA_BR_FREITAS: CognitiveScaleDefinition = {
  code: "moca_br_freitas",
  version: "freitas-py-moca-br-experimental-2026-09-v2",
  name: "MoCA — versão brasileira",
  dimension: "cognicao",
  instruction: "Aplicar a versão brasileira autorizada do MoCA e registrar os subtotais por domínio. O servidor soma 0–30 e adiciona 1 ponto quando a escolaridade é ≤12 anos, sem ultrapassar 30.",
  sourceNote: "MoCA-BR: subtotais por domínio e correção educacional de +1 ponto para ≤12 anos, limitada a 30. Memória et al. validaram MoCA-BR em idosos com ≥4 anos de escolaridade; estudos brasileiros posteriores mostram que o ponto de corte varia com escolaridade. A reprodução eletrônica detalhada permanece condicionada à licença/permissão aplicável configurada no prontuário.",
  questions: [
    { id: "visuospatial", label: "Visuoespacial / executiva", number: numeric(0, 5) },
    { id: "naming", label: "Nomeação", number: numeric(0, 3) },
    { id: "attention", label: "Atenção", number: numeric(0, 6) },
    { id: "language", label: "Linguagem", number: numeric(0, 3) },
    { id: "abstraction", label: "Abstração", number: numeric(0, 2) },
    { id: "delayed_recall", label: "Evocação tardia sem pistas", number: numeric(0, 5) },
    { id: "orientation", label: "Orientação", number: numeric(0, 6) },
    { id: "education_years", label: "Anos completos de escolaridade", number: numeric(0, 40, 1, "Usado para a correção de +1 ponto quando ≤12 anos e para contextualizar a interpretação.") },
  ],
};

export const VERBAL_FLUENCY_ANIMALS: CognitiveScaleDefinition = {
  code: "verbal_fluency_animals",
  version: "verbal-fluency-animals-br-2026-09-v1",
  name: "Fluência verbal semântica — animais",
  dimension: "cognicao",
  instruction: "Registrar o número de nomes de animais produzidos em 60 segundos e os anos completos de escolaridade. O prontuário registra o desempenho e o incorpora ao perfil cognitivo, sem aplicar um ponto de corte universal automático.",
  sourceNote: "Radanovic et al. 2009 (PMID 19619390) demonstraram influência da escolaridade e utilidade da fluência semântica na discriminação de doença de Alzheimer em amostra brasileira. O sistema preserva o valor bruto e evita um corte universal não sustentado para todas as escolaridades e contextos.",
  questions: [
    { id: "animal_count", label: "Animais nomeados em 60 segundos", number: numeric(0, 100, 1, "Conte apenas respostas válidas e não duplicadas conforme a aplicação clínica.") },
    { id: "education_years", label: "Anos completos de escolaridade", number: numeric(0, 40, 1, "A escolaridade influencia o desempenho e deve acompanhar a interpretação.") },
  ],
};

const iqcodeChoice = [
  choice(1, "Muito melhor"),
  choice(2, "Um pouco melhor"),
  choice(3, "Praticamente sem mudança"),
  choice(4, "Um pouco pior"),
  choice(5, "Muito pior"),
] as const;
const iqcodeLabels = [
  "Lembrar rostos de parentes e amigos", "Lembrar nomes de parentes e amigos", "Lembrar fatos sobre parentes e amigos", "Lembrar acontecimentos recentes", "Lembrar conversas após poucos dias", "Manter o fio de uma conversa", "Lembrar o próprio endereço e telefone", "Saber dia e mês", "Lembrar onde objetos são guardados", "Encontrar objetos guardados em local diferente", "Adaptar-se a mudanças do dia a dia", "Usar aparelhos domésticos", "Aprender a usar novo aparelho", "Aprender coisas novas", "Lembrar acontecimentos da juventude", "Lembrar aprendizagens da juventude", "Entender palavras pouco utilizadas", "Entender revistas e jornais", "Acompanhar histórias em livros ou televisão", "Escrever uma carta", "Conhecer fatos históricos importantes", "Tomar decisões no dia a dia", "Lidar com dinheiro em compras", "Lidar com assuntos financeiros", "Lidar com cálculos do cotidiano", "Usar a inteligência para compreender o que está acontecendo",
];
export const IQCODE_BR_26: CognitiveScaleDefinition = {
  code: "iqcode_br_26",
  version: "freitas-py-iqcode-br-26-2026-08-v1",
  name: "IQCODE-Br — 26 itens",
  dimension: "cognicao",
  instruction: "Aplicar a um informante que conheça o paciente e compare o desempenho atual com aproximadamente 10 anos antes. Cada item varia de 1 (muito melhor) a 5 (muito pior); o resultado é a média dos 26 itens.",
  sourceNote: "Freitas/Py Tabela A.12 para os 26 itens. Versão brasileira validada por Sanchez/Lourenço; o ponto 3,52 teve sensibilidade 83,3% e especificidade 80,7% em uma amostra clínica, mas outros estudos brasileiros encontraram cortes diferentes. O sistema usa 3,52 apenas como referência de rastreio versionada, nunca como diagnóstico.",
  questions: iqcodeLabels.map((label, index) => ({ id: `i${index + 1}`, label, choices: iqcodeChoice })),
};

export const COGNITIVE_FREITAS_SCALES = [MINICOG_FREITAS, MEEM_FREITAS, CLOCK_SHULMAN, MOCA_BR_FREITAS, VERBAL_FLUENCY_ANIMALS, IQCODE_BR_26] as const;

function strictAnswers(definition: CognitiveScaleDefinition, raw: Record<string, unknown>): Record<string, number> {
  const allowed = new Set(definition.questions.map((q) => q.id));
  if (Object.keys(raw).some((key) => !allowed.has(key))) throw new Error(`Resposta não permitida para ${definition.code}.`);
  const result: Record<string, number> = {};
  for (const question of definition.questions) {
    const value = raw[question.id];
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Resposta obrigatória inválida: ${question.id}.`);
    if (question.choices && !question.choices.some((option) => option.value === value)) throw new Error(`Resposta obrigatória inválida: ${question.id}.`);
    if (question.number && (value < question.number.min || value > question.number.max)) throw new Error(`Resposta obrigatória inválida: ${question.id}.`);
    result[question.id] = value;
  }
  return result;
}

function total(answers: Record<string, number>, omit: string[] = []): number {
  const ignored = new Set(omit);
  return Object.entries(answers).reduce((acc, [key, value]) => ignored.has(key) ? acc : acc + value, 0);
}

export function scoreCognitiveFreitasScale(code: CognitiveFreitasScaleCode, raw: Record<string, unknown>): { answers: Record<string, number>; result: ValidatedScaleResult; version: string } {
  const definition = COGNITIVE_FREITAS_SCALES.find((item) => item.code === code);
  if (!definition) throw new Error("Escala cognitiva validada não disponível.");
  const answers = strictAnswers(definition, raw);

  if (code === "minicog_freitas") {
    const score = answers.recall + answers.clock;
    const positive = score <= 2;
    return { answers, version: definition.version, result: { score, scoreText: `${score}/5`, classification: positive ? "Rastreio cognitivo positivo" : "Rastreio cognitivo não positivo", interpretation: positive ? "Mini-Cog 0–2 sugere maior probabilidade de comprometimento cognitivo e requer avaliação clínica complementar. Não estabelece diagnóstico." : "Mini-Cog 3–5 reduz a probabilidade de comprometimento cognitivo no rastreio, sem excluir alterações sutis ou queixas relevantes." } };
  }

  if (code === "meem_freitas") {
    const score = total(answers, ["education"]);
    const reference: Record<number, number> = { 0:20, 1:25, 5:26.5, 9:28, 12:29 };
    const median = reference[answers.education];
    return { answers, version: definition.version, result: { score, scoreText: `${score}/30`, classification: score < median ? "Abaixo da mediana de referência educacional" : "Na ou acima da mediana de referência educacional", interpretation: `MEEM bruto ${score}/30. Referência Brucki para a faixa educacional registrada: mediana ${median}/30 em adultos saudáveis. A escolaridade contextualiza a interpretação e não altera o escore bruto. Essa comparação não constitui ponto diagnóstico de demência.` } };
  }

  if (code === "clock_shulman") {
    const score = answers.score;
    return { answers, version: definition.version, result: { score, scoreText: `${score}/5`, classification: score >= 4 ? "Desenho classificado como normal pelo método Shulman" : "Desenho classificado como alterado pelo método Shulman", interpretation: "O desenho do relógio é teste de rastreio visuoespacial/executivo e deve ser integrado à escolaridade, visão, motricidade e demais dados cognitivos." } };
  }

  if (code === "moca_br_freitas") {
    const rawScore = total(answers, ["education_years"]);
    const correction = answers.education_years <= 12 ? 1 : 0;
    const score = Math.min(30, rawScore + correction);
    let classification = "Escore MoCA-BR registrado";
    let interpretation = `Escore bruto ${rawScore}/30; correção educacional +${correction}; total ${score}/30. `;
    if (answers.education_years < 4) {
      interpretation += "A validação brasileira usada como referência não sustenta um ponto de corte automático para escolaridade abaixo de 4 anos; interpretar clinicamente.";
    } else if (answers.education_years <= 12) {
      classification = score < 21 ? "Rastreio cognitivo alterado para a referência educacional adotada" : "Acima do ponto de rastreio educacional adotado";
      interpretation += "Em estudo brasileiro com estratificação educacional, escore corrigido <21 para 4–12 anos indicou necessidade de investigação cognitiva adicional. Não estabelece diagnóstico.";
    } else {
      classification = score < 20 ? "Rastreio cognitivo alterado para a referência educacional adotada" : "Acima do ponto de rastreio educacional adotado";
      interpretation += "Em estudo brasileiro com estratificação educacional, escore <20 para >12 anos indicou necessidade de investigação cognitiva adicional. Não estabelece diagnóstico.";
    }
    return { answers, version: definition.version, result: { score, scoreText: `Bruto ${rawScore}/30 · corrigido ${score}/30`, classification, interpretation } };
  }

  if (code === "verbal_fluency_animals") {
    const score = answers.animal_count;
    return {
      answers,
      version: definition.version,
      result: {
        score,
        scoreText: `${score} animais/60 s`,
        classification: "Fluência verbal semântica registrada",
        interpretation: `Foram registrados ${score} animais em 60 segundos, com ${answers.education_years} ano(s) completos de escolaridade. A escolaridade influencia o desempenho e a evidência brasileira apoia o uso da tarefa no rastreio cognitivo, mas o prontuário não aplica um ponto de corte universal automático. Interpretar no perfil cognitivo e no contexto clínico; não estabelece etiologia ou diagnóstico isoladamente.`,
      },
    };
  }

  const score = Math.round((total(answers) / 26) * 100) / 100;
  const positive = score >= 3.52;
  return { answers, version: definition.version, result: { score, scoreText: `${score.toFixed(2)}/5 (média de 26 itens)`, classification: positive ? "Rastreio informante acima da referência 3,52" : "Rastreio informante abaixo da referência 3,52", interpretation: "Maior média indica maior declínio relatado pelo informante. O corte 3,52 é uma referência brasileira de acurácia e não deve ser usado isoladamente para diagnosticar demência; estudos brasileiros mostram variação do melhor ponto de corte conforme a amostra." } };
}
