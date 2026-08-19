export const FREITAS_VALIDATED_SOURCE = "Freitas e Py — Apêndice: Instrumentos de Avaliação" as const;

export type ValidatedScaleCode = "mna_full" | "pfeffer10" | "sppb_freitas" | "poma_freitas";
export type ValidatedScaleChoice = { value: number; label: string };
export type ValidatedScaleQuestion = {
  id: string;
  label: string;
  choices?: readonly ValidatedScaleChoice[];
  number?: { min: number; max: number; step: number; unit?: string; help?: string };
};
export type ValidatedScaleDefinition = {
  code: ValidatedScaleCode;
  version: string;
  name: string;
  dimension: "nutricao" | "funcionalidade" | "mobilidade";
  instruction: string;
  sourceNote: string;
  questions: readonly ValidatedScaleQuestion[];
};
export type ValidatedScaleResult = {
  score: number;
  scoreText: string;
  classification: string;
  interpretation: string;
  clinicalColor?: "green" | "yellow" | "red";
};

const c = (value: number, label: string): ValidatedScaleChoice => ({ value, label });

export const MNA_FULL_FREITAS: ValidatedScaleDefinition = {
  code: "mna_full",
  version: "freitas-py-mna-full-2026-08-v1",
  name: "MNA completa — Miniavaliação Nutricional",
  dimension: "nutricao",
  instruction: "Aplicar os 18 itens A–R. A–F formam a triagem (máx. 14); o total completo varia de 0 a 30. O formulário preserva a MNA completa e não a confunde com MNA-SF.",
  sourceNote: "Freitas/Py Tabela A.4; IMC exatamente 23 resolvido como ≥23 pela especificação MNA/NINDS; classificação total validada por Vellas et al.",
  questions: [
    { id: "a_intake", label: "A — Redução da ingestão alimentar nos últimos 3 meses", choices: [c(0,"Diminuição grave"),c(1,"Diminuição moderada"),c(2,"Sem diminuição")] },
    { id: "b_weight", label: "B — Perda de peso nos últimos 3 meses", choices: [c(0,"> 3 kg"),c(1,"Não sabe informar"),c(2,"1 a 3 kg"),c(3,"Sem perda de peso")] },
    { id: "c_mobility", label: "C — Mobilidade", choices: [c(0,"Restrito ao leito/cadeira de rodas"),c(1,"Deambula, mas não sai de casa"),c(2,"Normal / sai de casa")] },
    { id: "d_stress", label: "D — Estresse psicológico ou doença aguda nos últimos 3 meses", choices: [c(0,"Sim"),c(2,"Não")] },
    { id: "e_neuropsych", label: "E — Problemas neuropsicológicos", choices: [c(0,"Demência ou depressão importante"),c(1,"Demência leve"),c(2,"Sem problemas neuropsicológicos registrados")] },
    { id: "f_bmi", label: "F — Índice de massa corporal", choices: [c(0,"IMC < 19"),c(1,"19 ≤ IMC < 21"),c(2,"21 ≤ IMC < 23"),c(3,"IMC ≥ 23")] },
    { id: "g_home", label: "G — Vive em sua própria casa (não instituição/hospital)", choices: [c(0,"Não"),c(1,"Sim")] },
    { id: "h_meds", label: "H — Usa mais de três medicamentos diferentes por dia", choices: [c(0,"Sim"),c(1,"Não")] },
    { id: "i_skin", label: "I — Lesões de pele ou úlceras por pressão", choices: [c(0,"Sim"),c(1,"Não")] },
    { id: "j_meals", label: "J — Número de refeições por dia", choices: [c(0,"Uma"),c(1,"Duas"),c(2,"Três")] },
    { id: "k_protein", label: "K — Leite/derivados diário + leguminosas/ovos ≥2x/semana + carne/peixe/frango diário", choices: [c(0,"Nenhuma ou uma resposta sim"),c(0.5,"Duas respostas sim"),c(1,"Três respostas sim")] },
    { id: "l_produce", label: "L — Duas ou mais porções diárias de frutas ou vegetais", choices: [c(0,"Não"),c(1,"Sim")] },
    { id: "m_fluids", label: "M — Líquidos por dia", choices: [c(0,"Menos de 3 copos"),c(0.5,"3 a 5 copos"),c(1,"Mais de 5 copos")] },
    { id: "n_feeding", label: "N — Modo de se alimentar", choices: [c(0,"Não se alimenta sozinho"),c(1,"Sozinho, com dificuldade"),c(2,"Sozinho, sem dificuldade")] },
    { id: "o_nutrition", label: "O — Percepção do próprio estado nutricional", choices: [c(0,"Acredita estar desnutrido"),c(1,"Não sabe"),c(2,"Acredita não ter problema nutricional")] },
    { id: "p_health", label: "P — Saúde em comparação com pessoas da mesma idade", choices: [c(0,"Não muito boa"),c(0.5,"Não sabe"),c(1,"Boa"),c(2,"Melhor")] },
    { id: "q_arm", label: "Q — Circunferência do braço", choices: [c(0,"< 21 cm"),c(0.5,"21 a 22 cm"),c(1,"> 22 cm")] },
    { id: "r_calf", label: "R — Circunferência da panturrilha", choices: [c(0,"< 31 cm"),c(1,"≥ 31 cm")] },
  ],
};

const pfefferChoices = [
  c(3, "A — Outra pessoa passou a fazer / incapaz de executar como antes"),
  c(2, "B — Precisa ser lembrado ou necessita ajuda"),
  c(1, "C — Faz sem ajuda, porém com maior dificuldade ou pior resultado"),
  c(0, "D — Faz sem lembrete ou ajuda, como antes"),
  c(1, "E — Nunca fazia e teria dificuldade para fazer agora"),
  c(0, "F — Não fazia regularmente, mas poderia fazer agora"),
] as const;

export const PFEFFER10_FREITAS: ValidatedScaleDefinition = {
  code: "pfeffer10",
  version: "freitas-py-pfeffer10-2026-08-v1",
  name: "Pfeffer FAQ — 10 itens",
  dimension: "funcionalidade",
  instruction: "Aplicar ao informante que conheça o desempenho habitual. Cada item recebe 0–3; total 0–30. Maior pontuação indica maior prejuízo funcional.",
  sourceNote: "Freitas/Py Tabela A.5 (10 itens); pontuação 0/0/1/1/2/3 e uso brasileiro complementados pela literatura do P-FAQ/Ministério da Saúde.",
  questions: [
    { id:"finance", label:"Finanças: cheques, contas e controle de necessidades financeiras", choices:pfefferChoices },
    { id:"business", label:"Negócios/documentos: seguros, documentos e imposto de renda", choices:pfefferChoices },
    { id:"shopping", label:"Comprar roupas, utilidades domésticas e mercearia", choices:pfefferChoices },
    { id:"hobby", label:"Jogos, palavras cruzadas, trabalhos manuais ou outro passatempo", choices:pfefferChoices },
    { id:"beverage", label:"Aquecer água, preparar café/chá e desligar o fogão", choices:pfefferChoices },
    { id:"meal", label:"Preparar uma refeição completa", choices:pfefferChoices },
    { id:"events", label:"Acompanhar acontecimentos atuais", choices:pfefferChoices },
    { id:"media", label:"Prestar atenção, entender e comentar TV, jornais ou revistas", choices:pfefferChoices },
    { id:"appointments", label:"Lembrar compromissos, tarefas, medicações ou eventos familiares", choices:pfefferChoices },
    { id:"transport", label:"Sair do bairro e utilizar transporte/orientar-se em deslocamentos", choices:pfefferChoices },
  ],
};

export const SPPB_FREITAS: ValidatedScaleDefinition = {
  code: "sppb_freitas",
  version: "freitas-py-sppb-3m-2026-08-v1",
  name: "SPPB — desempenho físico",
  dimension: "mobilidade",
  instruction: "Registrar equilíbrio e tempos brutos. Para marcha, usar o percurso de 3 m documentado no Freitas/Py. Digite 0 segundo somente quando o paciente não conseguir realizar o subteste.",
  sourceNote: "Freitas/Py Tabelas A.6–A.7 e figura de equilíbrio; critérios operacionais complementados pelo SPPB original/NIA. EWGSOP2: ≤8 indica baixo desempenho físico.",
  questions: [
    { id:"balance", label:"Equilíbrio — melhor desempenho na sequência pés juntos / semi-tandem / tandem", choices:[c(0,"Não mantém pés juntos por 10 s"),c(1,"Pés juntos 10 s; semi-tandem <10 s"),c(2,"Semi-tandem 10 s; tandem <3 s"),c(3,"Tandem 3 a 9,99 s"),c(4,"Tandem 10 s")] },
    { id:"gait_seconds", label:"Marcha de 3 metros — melhor tempo", number:{min:0,max:120,step:0.01,unit:"s",help:"0 = não conseguiu realizar; caso contrário, informe o tempo em segundos."} },
    { id:"chair_seconds", label:"Cinco levantamentos da cadeira — tempo", number:{min:0,max:180,step:0.01,unit:"s",help:"0 = não conseguiu realizar; >60 s também recebe 0 ponto."} },
  ],
};

const poma3 = [c(3,"Normal"),c(2,"Adaptativa"),c(1,"Anormal")] as const;
const poma2 = [c(2,"Normal"),c(1,"Anormal")] as const;
export const POMA_FREITAS: ValidatedScaleDefinition = {
  code: "poma_freitas",
  version: "freitas-py-poma-57-2026-08-v1",
  name: "POMA — equilíbrio e marcha",
  dimension: "mobilidade",
  instruction: "Versão Freitas/Py com 13 manobras de equilíbrio (1–3) e 9 componentes de marcha (1–2). Total 22–57. Não aplicar cortes da versão Tinetti de 28 pontos a esta versão.",
  sourceNote: "Freitas/Py Tabelas A.8–A.9. O apêndice define a pontuação dos itens e o somatório, mas não fornece corte categórico de risco para esta versão de 57 pontos.",
  questions: [
    {id:"b1",label:"1. Equilíbrio sentado",choices:poma3},{id:"b2",label:"2. Levantar-se da cadeira",choices:poma3},{id:"b3",label:"3. Equilíbrio de pé imediato",choices:poma3},{id:"b4",label:"4. Equilíbrio de pé",choices:poma3},{id:"b5",label:"5. Equilíbrio com olhos fechados",choices:poma3},{id:"b6",label:"6. Giro de 360°",choices:poma3},{id:"b7",label:"7. Nudge test / resposta a deslocamento",choices:poma3},{id:"b8",label:"8. Virar o pescoço",choices:poma3},{id:"b9",label:"9. Apoio unipodal",choices:poma3},{id:"b10",label:"10. Extensão da coluna",choices:poma3},{id:"b11",label:"11. Alcançar para cima",choices:poma3},{id:"b12",label:"12. Inclinar para frente e pegar objeto",choices:poma3},{id:"b13",label:"13. Sentar",choices:poma3},
    {id:"g14",label:"14. Iniciação da marcha",choices:poma2},{id:"g15",label:"15. Altura do passo",choices:poma2},{id:"g16",label:"16. Comprimento do passo",choices:poma2},{id:"g17",label:"17. Simetria do passo",choices:poma2},{id:"g18",label:"18. Continuidade do passo",choices:poma2},{id:"g19",label:"19. Desvio da linha média",choices:poma2},{id:"g20",label:"20. Estabilidade de tronco",choices:poma2},{id:"g21",label:"21. Sustentação/base durante a marcha",choices:poma2},{id:"g22",label:"22. Virada durante a marcha",choices:poma2},
  ],
};

export const VALIDATED_FREITAS_SCALES = [MNA_FULL_FREITAS, PFEFFER10_FREITAS, SPPB_FREITAS, POMA_FREITAS] as const;

function definitionFor(code: ValidatedScaleCode): ValidatedScaleDefinition {
  const found = VALIDATED_FREITAS_SCALES.find((item) => item.code === code);
  if (!found) throw new Error("Escala Freitas/Py validada não disponível.");
  return found;
}

function validateAnswers(definition: ValidatedScaleDefinition, raw: Record<string, unknown>): Record<string, number> {
  const allowed = new Set(definition.questions.map((q) => q.id));
  if (Object.keys(raw).some((key) => !allowed.has(key))) throw new Error(`Resposta não permitida para ${definition.code}.`);
  const out: Record<string, number> = {};
  for (const question of definition.questions) {
    const value = raw[question.id];
    if (typeof value !== "number" || !Number.isFinite(value)) throw new Error(`Resposta obrigatória inválida: ${question.id}.`);
    if (question.choices && !question.choices.some((choice) => choice.value === value)) throw new Error(`Resposta obrigatória inválida: ${question.id}.`);
    if (question.number && (value < question.number.min || value > question.number.max)) throw new Error(`Resposta obrigatória inválida: ${question.id}.`);
    out[question.id] = value;
  }
  return out;
}

function sum(answers: Record<string, number>, ids?: readonly string[]): number {
  return (ids ?? Object.keys(answers)).reduce((total, id) => total + answers[id], 0);
}

function scoreGait3m(seconds: number): number {
  if (seconds === 0) return 0;
  const value = Math.round(seconds * 100) / 100;
  if (value > 6.52) return 1;
  if (value >= 4.66) return 2;
  if (value >= 3.62) return 3;
  return 4;
}

function scoreChair(seconds: number): number {
  if (seconds === 0 || seconds > 60) return 0;
  const value = Math.round(seconds * 100) / 100;
  if (value >= 16.7) return 1;
  if (value >= 13.7) return 2;
  if (value >= 11.2) return 3;
  return 4;
}

export function scoreValidatedFreitasScale(code: ValidatedScaleCode, rawAnswers: Record<string, unknown>): { answers: Record<string, number>; result: ValidatedScaleResult; version: string } {
  const definition = definitionFor(code);
  const answers = validateAnswers(definition, rawAnswers);

  if (code === "mna_full") {
    const triage = sum(answers, ["a_intake","b_weight","c_mobility","d_stress","e_neuropsych","f_bmi"]);
    const score = sum(answers);
    const classification = score >= 24 ? "Estado nutricional normal" : score >= 17 ? "Risco de desnutrição" : "Desnutrição pelo MNA";
    return { answers, version: definition.version, result: { score, scoreText:`${score}/30 (triagem ${triage}/14)`, classification, interpretation:`Triagem A–F: ${triage}/14. O escore completo MNA deve ser interpretado no contexto clínico e das medidas antropométricas.`, clinicalColor: score >= 24 ? "green" : score >= 17 ? "yellow" : "red" } };
  }

  if (code === "pfeffer10") {
    const score = sum(answers);
    const positive = score >= 6;
    return { answers, version: definition.version, result: { score, scoreText:`${score}/30`, classification: positive ? "Rastreio de prejuízo funcional positivo" : "Sem prejuízo funcional relevante pelo corte adotado", interpretation: positive ? "Escore ≥6 sugere prejuízo em atividades funcionais. Relacione as dificuldades à cognição e às condições motoras/sensoriais; o instrumento não estabelece diagnóstico de demência." : "Escore abaixo de 6; revisar itens individualmente quando houver queixa funcional." } };
  }

  if (code === "sppb_freitas") {
    const balance = answers.balance;
    const gait = scoreGait3m(answers.gait_seconds);
    const chair = scoreChair(answers.chair_seconds);
    const score = balance + gait + chair;
    return { answers, version: definition.version, result: { score, scoreText:`${score}/12 (equilíbrio ${balance}; marcha ${gait}; cadeira ${chair})`, classification: score <= 8 ? "Baixo desempenho físico" : "Desempenho físico acima do corte de baixo desempenho", interpretation: `Tempos brutos preservados: marcha 3 m ${answers.gait_seconds}s; cinco levantamentos ${answers.chair_seconds}s. O SPPB descreve desempenho físico e deve ser integrado à avaliação de mobilidade, quedas e sarcopenia.`, clinicalColor: score <= 8 ? "yellow" : "green" } };
  }

  const balanceIds = Array.from({length:13},(_,i)=>`b${i+1}`);
  const gaitIds = Array.from({length:9},(_,i)=>`g${i+14}`);
  const balance = sum(answers, balanceIds);
  const gait = sum(answers, gaitIds);
  const score = balance + gait;
  return { answers, version: definition.version, result: { score, scoreText:`${score}/57 (equilíbrio ${balance}/39; marcha ${gait}/18)`, classification:"Escore POMA registrado", interpretation:"Maior pontuação indica melhor desempenho nesta versão Freitas/Py. Não foi aplicado corte de risco de quedas da versão Tinetti de 28 pontos, pois as versões não são equivalentes." } };
}
