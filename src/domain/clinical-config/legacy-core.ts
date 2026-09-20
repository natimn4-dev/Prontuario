import type { Classification, ScoreRange } from "../clinical-engine.ts";

export const LEGACY_CONFIG_VERSION = "1.0" as const;

export interface ItemScaleConfig {
  id: string;
  name: string;
  itemIds: readonly string[];
  ranges: ScoreRange[];
}

export const KATZ: ItemScaleConfig = {
  id: "katz",
  name: "Escala de Katz — Atividades Básicas de Vida Diária",
  itemIds: ["k1", "k2", "k3", "k4", "k5", "k6"],
  ranges: [
    { min: 6, max: 6, classe: "Independente", cor: "verde", texto: "Independente para todas as seis funções básicas do dia a dia." },
    { min: 3, max: 5, classe: "Dependência moderada", cor: "amarelo", texto: "Dependência moderada — precisa de ajuda em parte das atividades básicas do dia a dia." },
    { min: 0, max: 2, classe: "Dependência severa", cor: "vermelho", texto: "Muito dependente — dependência severa nas atividades básicas do dia a dia." },
  ],
};

export const PFEFFER: ItemScaleConfig = {
  id: "pfeffer",
  name: "Questionário de Pfeffer",
  itemIds: ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8", "p9", "p10", "p11"],
  ranges: [
    { min: 0, max: 5, classe: "Funcionalidade preservada", cor: "verde", texto: "Sem indício de comprometimento funcional pelo relato do acompanhante." },
    { min: 6, max: 33, classe: "Comprometimento funcional", cor: "vermelho", texto: "Comprometimento funcional relatado pelo acompanhante — investigar causa cognitiva, motora, sensorial ou de humor." },
  ],
};

export const GDS15: ItemScaleConfig = {
  id: "gds15",
  name: "GDS-15 — Escala de Depressão Geriátrica de Yesavage",
  itemIds: Array.from({ length: 15 }, (_, index) => `g${index + 1}`),
  ranges: [
    { min: 0, max: 5, classe: "Sem indício de depressão", cor: "verde", texto: "Rastreio negativo para sintomas depressivos." },
    { min: 6, max: 10, classe: "Rastreio positivo", cor: "amarelo", texto: "Rastreio positivo para sintomas depressivos. Indicada avaliação clínica mais detalhada." },
    { min: 11, max: 15, classe: "Sintomas moderados a graves", cor: "vermelho", texto: "Rastreio fortemente positivo — sugere quadro depressivo moderado a grave. Avaliação psicogeriátrica detalhada indicada, incluindo pesquisa ativa de ideação suicida." },
  ],
};

export const FRAIL_BR: ItemScaleConfig = {
  id: "frail_br",
  name: "Escala FRAIL-BR",
  itemIds: ["f1", "f2", "f3", "f4", "f5"],
  ranges: [
    { min: 0, max: 0, classe: "Idoso robusto", cor: "verde", texto: "Sem critérios de fragilidade — reservas fisiológicas preservadas." },
    { min: 1, max: 2, classe: "Idoso pré-frágil", cor: "amarelo", texto: "Condição pré-frágil — janela de oportunidade para intervenção: exercício resistido, otimização nutricional e revisão de medicações." },
    { min: 3, max: 5, classe: "Idoso frágil", cor: "vermelho", texto: "Critérios de fragilidade presentes — maior vulnerabilidade a eventos estressores (cirurgias, infecções, toxicidade de tratamentos). Indicada avaliação geriátrica completa e plano de cuidado individualizado." },
  ],
};

export const SARCF: ItemScaleConfig = {
  id: "sarcf",
  name: "SARC-F — Rastreio de Sarcopenia",
  itemIds: ["sf1", "sf2", "sf3", "sf4", "sf5"],
  ranges: [
    { min: 0, max: 3, classe: "Rastreio não positivo para sarcopenia", cor: "verde", texto: "SARC-F < 4: rastreio não positivo nesta aplicação. Reavaliar se houver perda de força, quedas, perda de peso ou declínio funcional." },
    { min: 4, max: 10, classe: "Rastreio positivo para sarcopenia", cor: "vermelho", texto: "SARC-F ≥ 4 identifica pessoa que deve prosseguir para avaliação de força muscular. Pelo EWGSOP2, sarcopenia provável requer baixa força muscular; o SARC-F isolado é ferramenta de busca de casos e não estabelece sarcopenia provável ou confirmada." },
  ],
};

export const SPPB: ItemScaleConfig = {
  id: "sppb",
  name: "SPPB — Short Physical Performance Battery",
  itemIds: ["s1", "s2", "s3"],
  ranges: [
    { min: 10, max: 12, classe: "Desempenho bom — faixa histórica local", cor: "verde", texto: "Agrupamento histórico do aplicativo para apresentação. Para novas avaliações, a versão SPPB Freitas/Py usa o corte EWGSOP2 ≤ 8 para baixo desempenho físico." },
    { min: 7, max: 9, classe: "Desempenho intermediário — faixa histórica local", cor: "amarelo", texto: "Agrupamento histórico do aplicativo para apresentação; não corresponde a uma categoria EWGSOP2 validada. Para novas avaliações, interpretar o SPPB versionado e seus tempos brutos." },
    { min: 0, max: 6, classe: "Desempenho baixo — faixa histórica local", cor: "vermelho", texto: "Agrupamento histórico do aplicativo para apresentação. Para novas avaliações, a versão SPPB Freitas/Py usa o corte EWGSOP2 ≤ 8 para baixo desempenho físico." },
  ],
};

export const MOCA_RANGES: ScoreRange[] = [
  { min: 26, max: 30, classe: "Dentro do esperado", cor: "verde", texto: "Desempenho dentro do esperado (26 pontos ou mais). O MoCA é sensível: resultado normal com queixa persistente de memória ainda merece acompanhamento." },
  { min: 18, max: 25, classe: "Comprometimento cognitivo leve provável", cor: "amarelo", texto: "Faixa compatível com comprometimento cognitivo leve. Investigar causas reversíveis (humor, tireoide, B12, medicações, déficits sensoriais, sono) e considerar avaliação neuropsicológica." },
  { min: 0, max: 17, classe: "Comprometimento cognitivo importante", cor: "vermelho", texto: "Desempenho bastante reduzido, em faixa compatível com demência. Investigar causas reversíveis e encaminhar para avaliação especializada." },
];

export const MEEM_EDUCATION_CUTOFFS: Record<string, number> = {
  Analfabeto: 20,
  "1 a 4 anos": 25,
  "5 a 8 anos": 26,
  "9 a 11 anos": 28,
  "Mais de 11 anos": 29,
};

export const MEEM_PRESERVED: Classification = {
  classe: "Dentro do esperado para a escolaridade",
  cor: "verde",
  texto: "Desempenho dentro do esperado para a escolaridade.",
};

export const MEEM_ALTERED: Classification = {
  classe: "Abaixo do esperado para a escolaridade",
  cor: "vermelho",
  texto: "Desempenho abaixo do esperado para a escolaridade — investigar comprometimento cognitivo considerando funcionalidade, humor, sono, déficits sensoriais e causas reversíveis.",
};

export const GRIP_SEX_CUTOFFS: Record<string, number> = {
  Masculino: 27,
  Feminino: 16,
};

export const GRIP_PRESERVED: Classification = {
  classe: "Normal",
  cor: "verde",
  texto: "Força de preensão dentro do esperado para o sexo.",
};

export const GRIP_ALTERED: Classification = {
  classe: "Reduzida",
  cor: "vermelho",
  texto: "Força de preensão abaixo do corte para o sexo — critério de sarcopenia provável (EWGSOP2).",
};

export const CHAIR_STAND_5X_RANGES: ScoreRange[] = [
  { min: 0, max: 15, classe: "Normal", cor: "verde", texto: "Força de membros inferiores preservada." },
  { min: 15.1, max: 999, classe: "Reduzida", cor: "vermelho", texto: "Tempo > 15 s — critério de força muscular reduzida (EWGSOP2). Suficiente para o diagnóstico de sarcopenia provável e para iniciar investigação e tratamento." },
];

export const TEN_CS: ItemScaleConfig = {
  id: "dez_cs",
  name: "10-CS — 10-Point Cognitive Screener",
  itemIds: ["dc1", "dc2", "dc3", "dc4", "dc5", "dc6", "dc7"],
  ranges: [
    {
      min: 8,
      max: 10,
      classe: "Normal",
      cor: "verde",
      texto:
        "Rastreio cognitivo dentro do esperado. Não exclui comprometimento leve; se houver queixa de memória, complementar a avaliação.",
    },
    {
      min: 6,
      max: 7,
      classe: "Comprometimento cognitivo possível",
      cor: "amarelo",
      texto:
        "Faixa geralmente compatível com comprometimento cognitivo leve. Indicada avaliação cognitiva mais detalhada e pesquisa de causas reversíveis.",
    },
    {
      min: 0,
      max: 5,
      classe: "Comprometimento cognitivo provável",
      cor: "vermelho",
      texto:
        "Faixa geralmente compatível com demência. Investigar causas reversíveis (humor, tireoide, B12, medicações, déficits sensoriais, delirium) e encaminhar para avaliação especializada.",
    },
  ],
};

export const TEN_CS_EDUCATION_ADJUSTMENTS: Record<string, number> = {
  Analfabeto: 2,
  "1 a 4 anos": 1,
};

export const TEN_CS_EDUCATION_NOTE =
  "Compatibilidade histórica: o AGA legado agrupava 1 a 4 anos e aplicava +1 ponto. Para novas avaliações, usar a versão estruturada 10-CS-Edu: sem escolaridade formal +2; 1 a 3 anos +1; 4 anos ou mais +0, limitado a 10 pontos. Não recalcular silenciosamente avaliações históricas.";

export const KPS: ItemScaleConfig = {
  id: "kps",
  name: "KPS — Karnofsky Performance Status",
  itemIds: ["kps1"],
  ranges: [
    {
      min: 90,
      max: 100,
      classe: "Desempenho preservado",
      cor: "verde",
      texto: "Capacidade funcional preservada para as atividades habituais.",
    },
    {
      min: 70,
      max: 80,
      classe: "Desempenho levemente reduzido",
      cor: "amarelo",
      texto:
        "KPS ≤ 80% — marcador de vulnerabilidade que reforça a indicação de avaliação geriátrica completa antes de tratamentos sistêmicos.",
    },
    {
      min: 10,
      max: 60,
      classe: "Desempenho significativamente reduzido",
      cor: "vermelho",
      texto:
        "Desempenho significativamente reduzido, com necessidade de assistência. Reavaliar objetivos de cuidado e intensidade terapêutica.",
    },
  ],
};

export const LACE: ItemScaleConfig = {
  id: "lace",
  name: "LACE Index — Risco de Reinternação em 30 dias",
  itemIds: ["la1", "la2", "la3", "la4"],
  ranges: [
    {
      min: 0,
      max: 4,
      classe: "Baixo risco",
      cor: "verde",
      texto: "Baixo risco de reinternação ou óbito em 30 dias após a alta.",
    },
    {
      min: 5,
      max: 9,
      classe: "Risco intermediário",
      cor: "amarelo",
      texto:
        "Risco intermediário — considerar contato telefônico ou visita em 7 a 14 dias após a alta.",
    },
    {
      min: 10,
      max: 19,
      classe: "Alto risco",
      cor: "vermelho",
      texto:
        "Alto risco de reinternação ou óbito em 30 dias — indicado plano de acompanhamento intensivo pós-alta, com contato precoce e revisão de medicações.",
    },
  ],
};

export const STOPP_FALL: ItemScaleConfig = {
  id: "stoppfall",
  name: "STOPPFall — Classes Medicamentosas de Risco de Queda",
  itemIds: Array.from({ length: 14 }, (_, index) => `sfl${index + 1}`),
  ranges: [
    {
      min: 0,
      max: 0,
      classe: "Sem classes de risco identificadas",
      cor: "verde",
      texto:
        "Nenhuma das classes medicamentosas de risco de queda do STOPPFall identificada na lista atual.",
    },
    {
      min: 1,
      max: 2,
      classe: "Atenção — faixa local do prontuário",
      cor: "amarelo",
      texto:
        "Uma a duas classes STOPPFall identificadas. A estratificação por contagem é uma regra local de priorização e não uma categoria de risco validada pelo consenso STOPPFall; revisar indicação, sintomas, quedas e possibilidade de desprescrição individualmente.",
    },
    {
      min: 3,
      max: 14,
      classe: "Maior carga de classes — faixa local do prontuário",
      cor: "vermelho",
      texto:
        "Três ou mais classes STOPPFall identificadas. A faixa é uma regra local de priorização, não um ponto de corte validado do consenso. Priorizar revisão medicamentosa individualizada; nenhuma classe determina retirada automática.",
    },
  ],
};

export const LAWTON: ItemScaleConfig = {
  id: "lawton",
  name: "Escala de Lawton — Atividades Instrumentais de Vida Diária",
  itemIds: ["l1", "l2", "l3", "l4", "l5", "l6", "l7"],
  ranges: [
    { min: 21, max: 21, classe: "Independente", cor: "verde", texto: "Independente para as atividades instrumentais avaliadas." },
    { min: 8, max: 20, classe: "Dependência parcial", cor: "amarelo", texto: "Dependência parcial para atividades instrumentais de vida diária." },
    { min: 7, max: 7, classe: "Dependência total", cor: "vermelho", texto: "Dependência total para as atividades instrumentais avaliadas." },
  ],
};

export const BARTHEL: ItemScaleConfig = {
  id: "barthel",
  name: "Índice de Barthel — Atividades Básicas de Vida Diária",
  itemIds: ["b1", "b2", "b3", "b4", "b5", "b6", "b7", "b8", "b9", "b10"],
  ranges: [
    { min: 100, max: 100, classe: "Independente", cor: "verde", texto: "Independente nas atividades avaliadas pelo Índice de Barthel." },
    { min: 60, max: 95, classe: "Dependência leve", cor: "amarelo", texto: "Dependência leve nas atividades básicas de vida diária." },
    { min: 40, max: 55, classe: "Dependência moderada", cor: "amarelo", texto: "Dependência moderada nas atividades básicas de vida diária." },
    { min: 20, max: 35, classe: "Dependência grave", cor: "vermelho", texto: "Dependência grave nas atividades básicas de vida diária." },
    { min: 0, max: 19, classe: "Dependência total", cor: "vermelho", texto: "Dependência total nas atividades básicas de vida diária." },
  ],
};

export const POLYPHARMACY: ItemScaleConfig = {
  id: "polifarmacia",
  name: "Polifarmácia e Medicamentos Potencialmente Inapropriados",
  itemIds: ["pf1", "pf2", "pf3", "pf4", "pf5"],
  ranges: [
    { min: 0, max: 1, classe: "Sem alerta relevante", cor: "verde", texto: "Sem indicadores importantes de risco medicamentoso." },
    { min: 2, max: 3, classe: "Atenção", cor: "amarelo", texto: "Presença de fatores de risco medicamentoso — indicada reconciliação e simplificação do esquema." },
    { min: 4, max: 7, classe: "Risco elevado", cor: "vermelho", texto: "Risco elevado de eventos adversos, interações e quedas. Indicada revisão formal com desprescrição e, quando possível, apoio de farmacêutico clínico." },
  ],
};

export const CORNELL: ItemScaleConfig = {
  id: "cornell",
  name: "Escala Cornell de Depressão na Demência",
  itemIds: Array.from({ length: 19 }, (_, index) => `co${index + 1}`),
  ranges: [
    { min: 0, max: 7, classe: "Sem indício de depressão", cor: "verde", texto: "Rastreio negativo para sintomas depressivos significativos." },
    { min: 8, max: 11, classe: "Sintomas depressivos prováveis", cor: "amarelo", texto: "Sintomas depressivos presentes. Investigar causas clínicas e medicamentosas e reavaliar em curto prazo." },
    { min: 12, max: 38, classe: "Depressão maior provável", cor: "vermelho", texto: "Escore acima de 12 sugere depressão maior. Escores acima de 18 indicam quadro grave. Indicada avaliação psicogeriátrica e definição de plano terapêutico." },
  ],
};

export const G8: ItemScaleConfig = {
  id: "g8",
  name: "G8 — Geriatric 8 (rastreio oncogeriátrico)",
  itemIds: ["g81", "g82", "g83", "g84", "g85", "g86", "g87", "g88"],
  ranges: [
    { min: 14.5, max: 17, classe: "Rastreio negativo", cor: "verde", texto: "G8 > 14 — sem indicação obrigatória de avaliação geriátrica ampla apenas com base no rastreio." },
    { min: 0, max: 14, classe: "Rastreio positivo", cor: "vermelho", texto: "G8 ≤ 14 — indica necessidade de Avaliação Geriátrica Ampla antes de definir o tratamento oncológico." },
  ],
};

export const APGAR_FAMILY: ItemScaleConfig = {
  id: "apgar_familiar",
  name: "APGAR de Família e Amigos",
  itemIds: ["a1", "a2", "a3", "a4", "a5"],
  ranges: [
    { min: 7, max: 10, classe: "Boa funcionalidade familiar", cor: "verde", texto: "Rede de apoio percebida como satisfatória." },
    { min: 4, max: 6, classe: "Disfunção moderada", cor: "amarelo", texto: "Disfunção familiar moderada — considerar orientação familiar e apoio do serviço social." },
    { min: 0, max: 3, classe: "Disfunção acentuada", cor: "vermelho", texto: "Disfunção familiar acentuada — encaminhamento ao serviço social e atenção a risco de negligência e maus-tratos." },
  ],
};

export const ZARIT_REDUCED: ItemScaleConfig = {
  id: "zarit_reduzida",
  name: "Escala de Zarit Reduzida — Sobrecarga do Cuidador",
  itemIds: ["z1", "z2", "z3", "z4", "z5", "z6", "z7"],
  ranges: [
    { min: 0, max: 10, classe: "Sobrecarga leve ou ausente", cor: "verde", texto: "Sem sinais importantes de sobrecarga do cuidador." },
    { min: 11, max: 16, classe: "Sobrecarga moderada", cor: "amarelo", texto: "Sobrecarga moderada — orientar divisão de tarefas, pausas programadas e grupos de apoio." },
    { min: 17, max: 28, classe: "Sobrecarga intensa", cor: "vermelho", texto: "Sobrecarga intensa — risco à saúde do cuidador e à segurança do cuidado. Intervenção prioritária." },
  ],
};

export const VES13: ItemScaleConfig = {
  id: "ves13",
  name: "VES-13 — Vulnerable Elders Survey",
  itemIds: ["v1", "v2", "v3", "v4"],
  ranges: [
    { min: 0, max: 2, classe: "Não vulnerável", cor: "verde", texto: "VES-13 < 3 — rastreio negativo para vulnerabilidade." },
    { min: 3, max: 10, classe: "Vulnerável", cor: "vermelho", texto: "VES-13 ≥ 3 — idoso vulnerável, com maior risco de declínio funcional e óbito. Indicada Avaliação Geriátrica Ampla." },
  ],
};

export const CHARLSON_WEIGHTS = {
  ch1: 1,
  ch2: 1,
  ch3: 1,
  ch4: 1,
  ch5: 1,
  ch6: 1,
  ch7: 1,
  ch8: 1,
  ch9: 1,
  ch10: 1,
  ch11: 2,
  ch12: 2,
  ch13: 2,
  ch14: 2,
  ch15: 2,
  ch16: 2,
  ch17: 3,
  ch18: 6,
  ch19: 6,
} as const;

export const CHARLSON_RANGES: ScoreRange[] = [
  { min: 0, max: 2, classe: "Carga de comorbidade baixa — faixa local", cor: "verde", texto: "Faixa local de apresentação do prontuário. O índice deve ser interpretado pelo valor e pelos componentes; esta faixa não é uma categoria de mortalidade individual validada." },
  { min: 3, max: 4, classe: "Carga de comorbidade moderada — faixa local", cor: "amarelo", texto: "Faixa local de apresentação do prontuário. Considerar o conjunto das comorbidades, funcionalidade, fragilidade e contexto clínico; não converter a faixa em prognóstico individual." },
  { min: 5, max: 99, classe: "Carga de comorbidade alta — faixa local", cor: "vermelho", texto: "Faixa local de apresentação do prontuário. O escore sugere maior carga de comorbidades, mas a categoria não corresponde a uma probabilidade individual validada de mortalidade." },
];

export const MNA_SF: ItemScaleConfig = {
  id: "mna_sf",
  name: "MNA-SF — Mini Avaliação Nutricional, forma reduzida",
  itemIds: ["n1", "n2", "n3", "n4", "n5", "n6"],
  ranges: [
    { min: 12, max: 14, classe: "Estado nutricional normal", cor: "verde", texto: "Estado nutricional dentro do esperado pelo MNA-SF." },
    { min: 8, max: 11, classe: "Risco de desnutrição", cor: "amarelo", texto: "Risco de desnutrição — indicada avaliação nutricional e acompanhamento de peso e ingestão." },
    { min: 0, max: 7, classe: "Desnutrido", cor: "vermelho", texto: "Rastreio compatível com desnutrição — priorizar avaliação e intervenção nutricional." },
  ],
};

export const FAST_ALLOWED_VALUES = [1, 2, 3, 4, 5, 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 7.5, 7.6] as const;
export const FAST_RANGES: ScoreRange[] = [
  { min: 1, max: 2.99, classe: "Sem declínio funcional objetivo", cor: "verde", texto: "Sem perda funcional objetiva no FAST." },
  { min: 3, max: 3.99, classe: "Declínio incipiente", cor: "amarelo", texto: "Déficits funcionais aparecem em situações mais exigentes." },
  { min: 4, max: 4.99, classe: "Demência leve", cor: "amarelo", texto: "Perda em atividades instrumentais complexas." },
  { min: 5, max: 5.99, classe: "Demência moderada", cor: "vermelho", texto: "Dependência funcional moderada, com necessidade crescente de supervisão." },
  { min: 6, max: 6.99, classe: "Demência moderadamente grave", cor: "vermelho", texto: "Dependência para atividades básicas e progressão funcional importante." },
  { min: 7, max: 7.99, classe: "Demência grave", cor: "vermelho", texto: "Perda progressiva de fala, marcha e controle postural." },
];

export const PPS_ALLOWED_VALUES = [10,20,30,40,50,60,70,80,90,100] as const;
export const PPS_RANGES: ScoreRange[] = [
  { min: 70, max: 100, classe: "PPS 70–100% — faixa local de apresentação", cor: "verde", texto: "Agrupamento local para visualização do desempenho funcional. O PPS descreve o estado funcional no momento e esta faixa não estima tempo de vida individual." },
  { min: 40, max: 60, classe: "PPS 40–60% — faixa local de apresentação", cor: "amarelo", texto: "Agrupamento local para visualização do desempenho funcional. Revisar necessidades de suporte e metas de cuidado conforme o contexto; não usar a faixa isoladamente como previsão prognóstica." },
  { min: 10, max: 30, classe: "PPS 10–30% — faixa local de apresentação", cor: "vermelho", texto: "Agrupamento local para visualização de funcionalidade muito reduzida. Priorizar avaliação de sintomas e necessidades de cuidado conforme metas definidas; não converter a faixa em estimativa individual de sobrevida." },
];

export const ESAS: ItemScaleConfig = {
  id: "esas",
  name: "ESAS — Escala de Avaliação de Sintomas de Edmonton",
  itemIds: ["es1","es2","es3","es4","es5","es6","es7","es8","es9"],
  ranges: [
    { min: 0, max: 9, classe: "Carga global baixa — faixa local", cor: "verde", texto: "Faixa local baseada na soma dos nove sintomas. A interpretação clínica deve priorizar cada sintoma individual e sua intensidade, mesmo quando o total é baixo." },
    { min: 10, max: 29, classe: "Carga global moderada — faixa local", cor: "amarelo", texto: "Faixa local baseada na soma dos nove sintomas. Identificar quais sintomas contribuem para o total e direcionar avaliação e tratamento a cada um." },
    { min: 30, max: 90, classe: "Carga global alta — faixa local", cor: "vermelho", texto: "Faixa local baseada na soma dos nove sintomas. A soma não substitui a avaliação individual; sintomas intensos ou urgentes devem ser priorizados independentemente do total." },
  ],
};

