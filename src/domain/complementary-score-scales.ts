import {
  scoreByEducation,
  scoreBySex,
  scoreDiscreteNumeric,
  scoreNumeric,
  type ScaleResult,
} from "./clinical-engine.ts";
import {
  BARTHEL,
  CHARLSON_RANGES,
  CHAIR_STAND_5X_RANGES,
  CORNELL,
  ESAS,
  FAST_ALLOWED_VALUES,
  FAST_RANGES,
  FRAIL_BR,
  G8,
  GRIP_ALTERED,
  GRIP_PRESERVED,
  GRIP_SEX_CUTOFFS,
  KPS,
  LACE,
  MEEM_ALTERED,
  MEEM_EDUCATION_CUTOFFS,
  MEEM_PRESERVED,
  MNA_SF,
  POLYPHARMACY,
  PPS_ALLOWED_VALUES,
  PPS_RANGES,
  SARCF,
  STOPP_FALL,
  TEN_CS,
  VES13,
} from "./clinical-config/legacy-core.ts";
import { KPS_OPTIONS } from "./performance-status-options.ts";

export type ComplementaryScoreScaleCode =
  | "moca"
  | "meem"
  | "barthel"
  | "cornell"
  | "cam"
  | "dez_cs"
  | "frail_br"
  | "sarcf"
  | "preensao"
  | "velocidade_marcha"
  | "sentar_levantar_5x"
  | "polifarmacia"
  | "stoppfall"
  | "kps"
  | "lace"
  | "g8"
  | "ves13"
  | "mna_sf"
  | "charlson"
  | "fast"
  | "pps"
  | "esas";

export type ComplementaryChoice = { value: number | string; label: string };
export type ComplementaryField = {
  id: string;
  label: string;
  number?: { min: number; max: number; step: number; unit?: string; help?: string };
  choices?: readonly ComplementaryChoice[];
};

export type ComplementaryScoreScaleDefinition = {
  code: ComplementaryScoreScaleCode;
  version: string;
  name: string;
  dimension: string;
  instruction: string;
  applicationGuide?: readonly {
    title: string;
    items: readonly string[];
  }[];
  sourceNote: string;
  fields: readonly ComplementaryField[];
};

export type ComplementaryStoredResult = {
  score: number;
  scoreText: string;
  classification: string;
  interpretation: string;
  clinicalColor?: string;
};

const LEGACY_SCORE_VERSION = "1.0" as const;
const MANUAL_CAM_VERSION = "legacy-cam-status-entry-2026-08-v1" as const;
const scoreField = (max: number, help: string, step = 1, unit?: string): ComplementaryField => ({
  id: "score",
  label: "Pontuação / resultado",
  number: { min: 0, max, step, unit, help },
});

const educationChoices: readonly ComplementaryChoice[] = [
  { value: "Analfabeto", label: "Analfabeto" },
  { value: "1 a 4 anos", label: "1 a 4 anos" },
  { value: "5 a 8 anos", label: "5 a 8 anos" },
  { value: "9 a 11 anos", label: "9 a 11 anos" },
  { value: "Mais de 11 anos", label: "Mais de 11 anos" },
];

const FAST_CHOICES: readonly ComplementaryChoice[] = [
  { value: 1, label: "1 — Sem dificuldade funcional objetiva" },
  { value: 2, label: "2 — Queixa subjetiva de esquecimento" },
  { value: 3, label: "3 — Dificuldade em tarefas complexas, trabalho ou organização" },
  { value: 4, label: "4 — Precisa de ajuda nas atividades instrumentais complexas" },
  { value: 5, label: "5 — Precisa de ajuda para escolher roupas adequadas" },
  { value: 6.1, label: "6a — Precisa de ajuda para vestir-se" },
  { value: 6.2, label: "6b — Precisa de ajuda para banhar-se" },
  { value: 6.3, label: "6c — Precisa de ajuda com a mecânica do toalete" },
  { value: 6.4, label: "6d — Incontinência urinária" },
  { value: 6.5, label: "6e — Incontinência fecal" },
  { value: 7.1, label: "7a — Fala limitada a cerca de seis palavras compreensíveis ao dia" },
  { value: 7.2, label: "7b — Fala limitada a uma palavra compreensível ao dia" },
  { value: 7.3, label: "7c — Perdeu a capacidade de caminhar" },
  { value: 7.4, label: "7d — Perdeu a capacidade de sentar sem apoio" },
  { value: 7.5, label: "7e — Perdeu a capacidade de sorrir" },
  { value: 7.6, label: "7f — Perdeu a capacidade de sustentar a cabeça" },
];

const PPS_CHOICES: readonly ComplementaryChoice[] = [
  { value: 100, label: "100% — Deambula e trabalha normalmente; autocuidado, ingestão e consciência preservados" },
  { value: 90, label: "90% — Atividade normal, com sinais de doença; autocuidado e ingestão preservados" },
  { value: 80, label: "80% — Atividade normal com esforço; autocuidado preservado; ingestão normal ou reduzida" },
  { value: 70, label: "70% — Deambulação reduzida; não mantém trabalho habitual; autocuidado preservado" },
  { value: 60, label: "60% — Deambulação reduzida; ajuda ocasional; ingestão normal ou reduzida" },
  { value: 50, label: "50% — Principalmente sentado/deitado; ajuda considerável; ingestão normal ou reduzida" },
  { value: 40, label: "40% — Principalmente no leito; requer assistência na maior parte do cuidado" },
  { value: 30, label: "30% — Totalmente acamado; cuidado total; ingestão normal ou reduzida" },
  { value: 20, label: "20% — Totalmente acamado; cuidado total; apenas pequenos goles" },
  { value: 10, label: "10% — Totalmente acamado; cuidado total; apenas cuidados de boca" },
];

const KPS_ALLOWED_VALUES = KPS_OPTIONS.map((choice) => Number(choice.value));

export const COMPLEMENTARY_SCORE_SCALES: readonly ComplementaryScoreScaleDefinition[] = [
  {
    code: "moca",
    version: LEGACY_SCORE_VERSION,
    name: "MoCA — registro rápido de pontuação",
    dimension: "cognicao",
    instruction: "Registre apenas a pontuação total de um MoCA já aplicado. Este campo não reproduz o formulário do instrumento.",
    sourceNote: "Registro de escore compatível com o protocolo histórico do aplicativo. Resultado é rastreio e não estabelece diagnóstico isoladamente.",
    fields: [scoreField(30, "Informe o total de 0 a 30 obtido no instrumento aplicado.")],
  },
  {
    code: "meem",
    version: LEGACY_SCORE_VERSION,
    name: "MEEM — registro rápido de pontuação",
    dimension: "cognicao",
    instruction: "Registre a pontuação total do MEEM já aplicado e a escolaridade usada para contextualizar o resultado. Este campo não reproduz os itens do MMSE/MEEM.",
    sourceNote: "Interpretação contextual por escolaridade preservada do protocolo histórico brasileiro; não equivale a diagnóstico de demência.",
    fields: [
      scoreField(30, "Informe o total de 0 a 30."),
      { id: "education", label: "Escolaridade para interpretação", choices: educationChoices },
    ],
  },
  { code: "barthel", version: LEGACY_SCORE_VERSION, name: "Índice de Barthel", dimension: "funcionalidade", instruction: "Registro rápido do escore total previamente aplicado.", sourceNote: "Faixas preservadas do golden master clínico do aplicativo.", fields: [scoreField(100, "Informe o escore total de 0 a 100.")] },
  { code: "cornell", version: LEGACY_SCORE_VERSION, name: "Cornell — depressão na demência", dimension: "humor", instruction: "Entreviste cuidador e paciente separadamente, reconcilie as respostas com a observação clínica e registre o total.", applicationGuide: [
    { title: "Como pontuar", items: ["Avalie 19 manifestações referentes à última semana.", "Para cada manifestação: 0 = ausente; 1 = leve ou intermitente; 2 = grave; use a opção de não avaliável quando não houver informação confiável.", "Some apenas os itens pontuados: total esperado de 0 a 38."] },
    { title: "O que revisar", items: ["Humor: ansiedade, tristeza, irritabilidade e perda de reação a eventos agradáveis.", "Comportamento: agitação, lentificação, múltiplas queixas físicas e perda de interesse.", "Sinais físicos e ritmos: apetite, peso, energia, variação diurna, sono e despertares.", "Ideação: ideias de culpa, desesperança, desvalia ou suicídio."] },
    { title: "Leitura usada no prontuário", items: ["0–7: sem indicação relevante no rastreio.", "8–11: sintomas depressivos prováveis.", "12–38: depressão maior provável; exige avaliação clínica, não diagnóstico automático."] },
  ], sourceNote: "Faixas preservadas do golden master; resultado é rastreio clínico e não diagnóstico isolado.", fields: [scoreField(38, "Informe o total de 0 a 38 após integrar informante, paciente e observação clínica.")] },
  {
    code: "cam",
    version: MANUAL_CAM_VERSION,
    name: "CAM — Confusion Assessment Method",
    dimension: "cognicao",
    instruction: "Registre somente a conclusão de um CAM já aplicado segundo o algoritmo apropriado.",
    sourceNote: "O formulário/algoritmo não é reproduzido neste registro rápido. CAM positivo exige avaliação clínica imediata de possível delirium.",
    fields: [{ id: "status", label: "Resultado do CAM aplicado", choices: [{ value: 0, label: "CAM negativo" }, { value: 1, label: "CAM positivo" }] }],
  },
  { code: "dez_cs", version: LEGACY_SCORE_VERSION, name: "10-CS — 10-Point Cognitive Screener", dimension: "cognicao", instruction: "Aplique os três blocos abaixo e registre o escore final corrigido conforme a versão brasileira usada pelo serviço.", applicationGuide: [
    { title: "Componentes (total bruto 0–10)", items: ["Orientação temporal: três perguntas, até 3 pontos.", "Fluência verbal: animais nomeados em um minuto, convertido na escala de 0 a 4 pontos da versão brasileira.", "Evocação tardia: recordar as três palavras apresentadas, até 3 pontos."] },
    { title: "Correção e leitura do protocolo atual", items: ["Aplique a correção educacional prevista na versão brasileira adotada e limite o resultado a 10 pontos.", "8–10: desempenho dentro da faixa esperada; 6–7: possível comprometimento; 0–5: provável comprometimento.", "Registre o valor final corrigido. Rastreio alterado deve ser interpretado com funcionalidade, humor, visão, audição e contexto clínico."] },
  ], sourceNote: "Estrutura baseada no 10-CS brasileiro (PMID 25779210); faixas e correção educacional permanecem as do protocolo histórico do aplicativo. Não usar isoladamente como diagnóstico.", fields: [scoreField(10, "Informe o escore final de 0 a 10 após a correção educacional da versão aplicada.")] },
  { code: "frail_br", version: LEGACY_SCORE_VERSION, name: "FRAIL-BR", dimension: "fragilidade", instruction: "Pergunte os cinco componentes da última situação habitual e marque 1 ponto para cada resposta de risco.", applicationGuide: [
    { title: "Cinco componentes (0 ou 1 ponto cada)", items: ["Fadiga: sentir-se cansado na maior parte ou o tempo todo nas últimas quatro semanas.", "Resistência: dificuldade para subir dez degraus sem parar e sem ajuda.", "Deambulação: dificuldade para caminhar algumas centenas de metros sem ajuda.", "Doenças: cinco ou mais entre as condições crônicas previstas na versão validada.", "Perda de peso: redução não intencional de pelo menos 5% no último ano."] },
    { title: "Leitura usada no prontuário", items: ["0: robusto.", "1–2: pré-frágil.", "3–5: frágil."] },
  ], sourceNote: "Faixas 0 / 1–2 / 3–5 preservadas do golden master. Confirme as perguntas e os limiares da versão FRAIL-BR validada adotada pelo serviço.", fields: [scoreField(5, "Some um ponto por componente positivo; informe o total de 0 a 5.")] },
  { code: "sarcf", version: LEGACY_SCORE_VERSION, name: "SARC-F", dimension: "mobilidade", instruction: "Pontue os cinco domínios conforme a dificuldade relatada e some o total.", applicationGuide: [
    { title: "Itens e pontuação", items: ["Força para carregar cerca de 4,5 kg; caminhar pelo quarto; levantar-se de cadeira ou cama; subir dez degraus: 0 = sem dificuldade, 1 = alguma dificuldade, 2 = muita dificuldade ou incapaz.", "Quedas no último ano: 0 = nenhuma, 1 = uma a três, 2 = quatro ou mais.", "Some os cinco itens: total de 0 a 10."] },
    { title: "Leitura usada no prontuário", items: ["0–3: rastreio negativo.", "4–10: rastreio positivo para risco de sarcopenia; confirmar em avaliação clínica."] },
  ], sourceNote: "Corte de rastreio ≥4 preservado do golden master; não confirma sarcopenia isoladamente.", fields: [scoreField(10, "Some os cinco itens e informe o total de 0 a 10.")] },
  {
    code: "preensao",
    version: LEGACY_SCORE_VERSION,
    name: "Força de preensão palmar",
    dimension: "mobilidade",
    instruction: "Registre a melhor medida válida e o sexo usado para a referência do protocolo.",
    sourceNote: "Referências históricas do aplicativo: feminino 16 kgF; masculino 27 kgF.",
    fields: [
      { id: "score", label: "Força de preensão", number: { min: 0, max: 100, step: 0.1, unit: "kgF", help: "Informe a força em kgF." } },
      { id: "sex", label: "Sexo para referência", choices: [{ value: "Feminino", label: "Feminino" }, { value: "Masculino", label: "Masculino" }] },
    ],
  },
  { code: "velocidade_marcha", version: LEGACY_SCORE_VERSION, name: "Velocidade de marcha", dimension: "mobilidade", instruction: "Registre a velocidade de marcha calculada em m/s.", sourceNote: "Protocolo histórico considera ≤0,8 m/s como desempenho reduzido.", fields: [{ id: "score", label: "Velocidade de marcha", number: { min: 0, max: 4, step: 0.01, unit: "m/s", help: "Informe a velocidade já calculada." } }] },
  { code: "sentar_levantar_5x", version: LEGACY_SCORE_VERSION, name: "Sentar-levantar 5 vezes", dimension: "mobilidade", instruction: "Registre o tempo total do teste em segundos.", sourceNote: "Referência histórica do aplicativo: até 15 s preservado; acima de 15 s reduzido.", fields: [{ id: "score", label: "Tempo", number: { min: 0, max: 180, step: 0.1, unit: "s", help: "Informe o tempo em segundos." } }] },
  { code: "polifarmacia", version: LEGACY_SCORE_VERSION, name: "Polifarmácia / medicamentos potencialmente inapropriados", dimension: "medicamentos", instruction: "Faça uma reconciliação estruturada e registre o escore agregado do protocolo local atual.", applicationGuide: [
    { title: "Revisão em sete pontos", items: ["Número total de medicamentos em uso e presença de polifarmácia.", "Indicação atual e objetivo de cada medicamento.", "Medicamento potencialmente inapropriado segundo critério validado adotado pelo serviço.", "Duplicidade terapêutica ou interação clinicamente relevante.", "Carga anticolinérgica ou sedativa e medicamentos associados a quedas.", "Complexidade dos horários, adesão e capacidade de manejo pelo paciente/cuidador.", "Possível evento adverso, hipotensão postural, sangramento, hipoglicemia, confusão ou queda relacionado ao tratamento."] },
    { title: "Segurança", items: ["Use esta lista para revisar; atribua o total apenas segundo o protocolo local já adotado, pois os sete pontos não têm peso automático nesta tela.", "0–1: sem alerta maior; 2–3: atenção; 4–7: alerta alto.", "Não iniciar, suspender ou mudar doses automaticamente; toda decisão medicamentosa exige revisão médica e reconciliação com a tabela final."] },
  ], sourceNote: "Faixas 0–1 / 2–3 / 4–7 preservadas do golden master. O guia organiza a revisão, mas não cria um novo algoritmo de pontuação.", fields: [scoreField(7, "Informe o escore agregado de 0 a 7 calculado conforme o protocolo local vigente.")] },
  { code: "stoppfall", version: LEGACY_SCORE_VERSION, name: "STOPPFall — classes de risco de queda", dimension: "medicamentos", instruction: "Conte quantas das 14 classes STOPPFall estão presentes na lista reconciliada.", applicationGuide: [
    { title: "Classes a conferir", items: ["Anticolinérgicos; diuréticos; alfa-bloqueadores usados como anti-hipertensivos; opioides.", "Antidepressivos; antipsicóticos; antiepilépticos; benzodiazepínicos; fármacos relacionados aos benzodiazepínicos.", "Anti-hipertensivos de ação central; alfa-bloqueadores para hiperplasia prostática; anti-histamínicos.", "Vasodilatadores usados em doenças cardíacas; fármacos para bexiga hiperativa ou incontinência de urgência."] },
    { title: "Como registrar", items: ["Conte classes, não o número de comprimidos ou princípios ativos da mesma classe.", "0: nenhuma classe; 1–2: atenção; 3–14: alerta alto no protocolo atual.", "A presença de uma classe não determina retirada automática: revisar indicação, sintomas, quedas e risco de retirada com a equipe."] },
  ], sourceNote: "Classes baseadas no consenso STOPPFall (PMID 33349863); faixas 0 / 1–2 / 3–14 preservadas do golden master.", fields: [scoreField(14, "Informe o número de classes de risco identificadas, de 0 a 14.")] },
  { code: "kps", version: LEGACY_SCORE_VERSION, name: "Karnofsky Performance Status", dimension: "prognostico", instruction: "Escolha o nível que melhor descreve atividade, autocuidado e necessidade de assistência.", sourceNote: "Faixas históricas do aplicativo preservadas; use o nível predominante no período avaliado.", fields: [{ id: "score", label: "KPS — valor e significado", choices: KPS_OPTIONS }] },
  { code: "lace", version: LEGACY_SCORE_VERSION, name: "LACE — risco de reinternação", dimension: "prognostico", instruction: "Calcule os quatro componentes referentes à alta e registre o total.", applicationGuide: [
    { title: "L — tempo de internação", items: ["1 dia = 1; 2 dias = 2; 3 dias = 3; 4–6 dias = 4; 7–13 dias = 5; 14 dias ou mais = 7."] },
    { title: "A, C e E", items: ["A — admissão aguda pelo pronto atendimento: sim = 3; não = 0.", "C — comorbidade pelo Charlson: 0 = 0; 1 = 1; 2 = 2; 3 = 3; 4 ou mais = 5.", "E — visitas ao pronto atendimento nos seis meses anteriores: 0 a 4 pontos, com máximo de 4."] },
    { title: "Leitura usada no prontuário", items: ["Some L + A + C + E: total de 0 a 19.", "0–4: baixo; 5–9: intermediário; 10–19: alto risco no protocolo atual."] },
  ], sourceNote: "Componentes do índice LACE; faixas 0–4 / 5–9 / 10–19 preservadas do golden master.", fields: [scoreField(19, "Some L + A + C + E e informe o total de 0 a 19.")] },
  { code: "g8", version: LEGACY_SCORE_VERSION, name: "G8 — rastreio oncogeriátrico", dimension: "oncogeriatria", instruction: "Registre o escore total do G8 previamente aplicado.", sourceNote: "Corte histórico do aplicativo: ≤14 rastreio positivo; >14 rastreio negativo.", fields: [{ id: "score", label: "Pontuação G8", number: { min: 0, max: 17, step: 0.5, help: "Informe o escore de 0 a 17." } }] },
  { code: "ves13", version: LEGACY_SCORE_VERSION, name: "VES-13", dimension: "fragilidade", instruction: "Registre o escore total do VES-13 previamente aplicado.", sourceNote: "Corte ≥3 preservado do golden master.", fields: [scoreField(10, "Informe o total de 0 a 10.")] },
  { code: "mna_sf", version: LEGACY_SCORE_VERSION, name: "MNA-SF — registro de pontuação", dimension: "nutricao", instruction: "Aplique os seis componentes da MNA-SF e registre o total; use IMC ou circunferência da panturrilha conforme a versão validada.", applicationGuide: [
    { title: "Seis componentes", items: ["Redução da ingestão nos últimos três meses.", "Perda de peso nos últimos três meses.", "Mobilidade.", "Estresse psicológico ou doença aguda nos últimos três meses.", "Problemas neuropsicológicos.", "IMC; quando não disponível, use a alternativa de circunferência da panturrilha prevista na versão aplicada."] },
    { title: "Leitura usada no prontuário", items: ["0–7: desnutrição.", "8–11: risco de desnutrição.", "12–14: estado nutricional normal."] },
  ], sourceNote: "Estrutura baseada na MNA-SF validada (PMID 19812868); faixas 0–7 / 8–11 / 12–14 preservadas do golden master. Respeitar a versão licenciada/validada adotada.", fields: [scoreField(14, "Some os seis componentes e informe o total de 0 a 14.")] },
  { code: "charlson", version: LEGACY_SCORE_VERSION, name: "Índice de Charlson", dimension: "prognostico", instruction: "Some os pesos das comorbidades presentes, sem duplicar gravidades da mesma condição, e acrescente idade apenas se o protocolo escolhido usar o ajuste etário.", applicationGuide: [
    { title: "Pesos clássicos das comorbidades", items: ["1 ponto: infarto, insuficiência cardíaca, doença vascular periférica, doença cerebrovascular, demência, doença pulmonar crônica, doença do tecido conjuntivo, úlcera, doença hepática leve e diabetes sem lesão de órgão-alvo.", "2 pontos: hemiplegia, doença renal moderada/grave, diabetes com lesão de órgão-alvo, tumor sem metástase, leucemia e linfoma.", "3 pontos: doença hepática moderada/grave.", "6 pontos: tumor sólido metastático e AIDS."] },
    { title: "Ajuste etário clássico, se aplicável", items: ["Menos de 50 anos = 0; 50–59 = +1; 60–69 = +2; 70–79 = +3; 80 ou mais = +4.", "Não some formas leve e grave da mesma condição; use apenas o maior peso correspondente."] },
    { title: "Leitura local do prontuário", items: ["0–2: baixa carga; 3–4: moderada; 5 ou mais: alta carga de comorbidades.", "Informe o índice final da versão escolhida e registre no texto clínico se incluiu idade."] },
  ], sourceNote: "Pesos do índice clássico de Charlson; as faixas de interpretação são regras locais históricas e devem ser integradas à funcionalidade, fragilidade e metas de cuidado.", fields: [scoreField(40, "Informe o índice final calculado e documente no registro clínico se incluiu idade.")] },
  { code: "fast", version: LEGACY_SCORE_VERSION, name: "FAST — Functional Assessment Staging", dimension: "cognicao", instruction: "Selecione o estágio funcional que melhor corresponde ao nível atual; o significado aparece ao lado de cada valor.", sourceNote: "Estágios discretos 1–7f preservados do golden master; a escolha exige correlação clínica e funcional.", fields: [{ id: "score", label: "Estágio FAST — valor e significado", choices: FAST_CHOICES }] },
  { code: "pps", version: LEGACY_SCORE_VERSION, name: "Palliative Performance Scale — PPS", dimension: "prognostico", instruction: "Escolha a linha que melhor combina deambulação, atividade/doença, autocuidado, ingestão e nível de consciência.", sourceNote: "Níveis discretos de 10 a 100 preservados do golden master. Quando os domínios divergem, use julgamento clínico conforme o manual adotado.", fields: [{ id: "score", label: "PPS — valor e significado", choices: PPS_CHOICES }] },
  { code: "esas", version: LEGACY_SCORE_VERSION, name: "ESAS — carga global de sintomas", dimension: "sintomas", instruction: "Peça ao paciente para graduar cada sintoma de 0 a 10 no período definido pelo serviço e some os nove itens.", applicationGuide: [
    { title: "Nove sintomas (0 = ausente; 10 = pior intensidade imaginável)", items: ["Dor; cansaço/fadiga; náusea; depressão; ansiedade.", "Sonolência; apetite; sensação de bem-estar; falta de ar.", "Registre também cada item no texto clínico quando houver intensidade alta, mesmo que esta tela armazene apenas o total."] },
    { title: "Total usado nesta tela", items: ["Some os nove itens: 0–90.", "0–9: baixa carga global; 10–29: moderada; 30–90: alta no protocolo histórico.", "O total não substitui a resposta a um sintoma grave isolado nem a avaliação de urgência."] },
  ], sourceNote: "Este modo rápido preserva somente a classificação global; os nove sintomas devem ser revistos individualmente para decisões clínicas.", fields: [scoreField(90, "Some os nove itens de 0 a 10 e informe o total de 0 a 90.")] },
] as const;

function requiredNumber(raw: Record<string, unknown>, id: string, min: number, max: number): number {
  const value = raw[id];
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new Error(`Valor inválido para ${id}.`);
  }
  return value;
}

function requiredString(raw: Record<string, unknown>, id: string): string {
  const value = raw[id];
  if (typeof value !== "string" || !value.trim()) throw new Error(`Valor inválido para ${id}.`);
  return value;
}

function fromLegacy(result: ScaleResult): ComplementaryStoredResult {
  if (result.score === null) throw new Error("Não foi possível interpretar o escore informado.");
  return {
    score: result.score,
    scoreText: result.scoreText,
    classification: result.classe,
    interpretation: result.texto,
    clinicalColor: result.cor,
  };
}

function numeric(raw: Record<string, unknown>, max: number, ranges: Parameters<typeof scoreNumeric>[0]["ranges"], unit?: string) {
  const value = requiredNumber(raw, "score", 0, max);
  return fromLegacy(scoreNumeric({ raw: value, ranges, unit }));
}

export function scoreComplementaryScale(
  code: ComplementaryScoreScaleCode,
  raw: Record<string, unknown>,
): { answers: Record<string, number | string>; result: ComplementaryStoredResult; version: string } {
  const definition = COMPLEMENTARY_SCORE_SCALES.find((item) => item.code === code);
  if (!definition) throw new Error("Escala complementar não disponível.");

  let result: ComplementaryStoredResult;
  if (code === "moca") {
    const score = requiredNumber(raw, "score", 0, 30);
    if (score >= 26) result = { score, scoreText: `${score}/30`, classification: "Faixa de referência histórica preservada", interpretation: "Pontuação na faixa historicamente considerada preservada pelo protocolo legado. O MoCA é instrumento de rastreio; queixa cognitiva persistente ainda exige correlação clínica e educacional.", clinicalColor: "verde" };
    else if (score >= 18) result = { score, scoreText: `${score}/30`, classification: "Abaixo da faixa de referência histórica", interpretation: "Pontuação abaixo da referência histórica do aplicativo. Interpretar em conjunto com escolaridade, funcionalidade, humor, sono, déficits sensoriais e demais dados clínicos; o resultado isolado não estabelece diagnóstico.", clinicalColor: "amarelo" };
    else result = { score, scoreText: `${score}/30`, classification: "Desempenho bastante reduzido no rastreio", interpretation: "Pontuação bastante reduzida no rastreio cognitivo. Requer avaliação clínica contextualizada; o escore isolado não define etiologia nem diagnóstico.", clinicalColor: "vermelho" };
  } else if (code === "meem") {
    const score = requiredNumber(raw, "score", 0, 30);
    const education = requiredString(raw, "education");
    if (!(education in MEEM_EDUCATION_CUTOFFS)) throw new Error("Escolaridade inválida para interpretação do MEEM.");
    result = fromLegacy(scoreByEducation({ value: score, education, cutoffs: MEEM_EDUCATION_CUTOFFS, preserved: MEEM_PRESERVED, altered: MEEM_ALTERED }));
  } else if (code === "barthel") result = numeric(raw, 100, BARTHEL.ranges);
  else if (code === "cornell") result = numeric(raw, 38, CORNELL.ranges);
  else if (code === "cam") {
    const status = requiredNumber(raw, "status", 0, 1);
    result = status === 1
      ? { score: 1, scoreText: "CAM positivo", classification: "Delirium provável no rastreio", interpretation: "CAM positivo requer avaliação clínica imediata da causa, gravidade e segurança. O registro não substitui o algoritmo completo nem determina etiologia.", clinicalColor: "vermelho" }
      : { score: 0, scoreText: "CAM negativo", classification: "CAM não positivo", interpretation: "CAM registrado como negativo na avaliação aplicada. Reavaliar se houver mudança aguda ou flutuação do estado mental.", clinicalColor: "verde" };
  } else if (code === "dez_cs") result = numeric(raw, 10, TEN_CS.ranges);
  else if (code === "frail_br") result = numeric(raw, 5, FRAIL_BR.ranges);
  else if (code === "sarcf") result = numeric(raw, 10, SARCF.ranges);
  else if (code === "preensao") {
    const score = requiredNumber(raw, "score", 0, 100);
    const sex = requiredString(raw, "sex");
    result = fromLegacy(scoreBySex({ value: score, sex, cutoffs: GRIP_SEX_CUTOFFS, preserved: GRIP_PRESERVED, altered: GRIP_ALTERED, unit: "kgF" }));
  } else if (code === "velocidade_marcha") {
    const score = requiredNumber(raw, "score", 0, 4);
    result = score <= 0.8
      ? { score, scoreText: `${score.toFixed(2)} m/s`, classification: "Velocidade de marcha reduzida", interpretation: "Velocidade ≤0,8 m/s no protocolo histórico sugere baixo desempenho físico e maior vulnerabilidade funcional. Correlacionar com quedas, força, equilíbrio e condição clínica.", clinicalColor: "vermelho" }
      : { score, scoreText: `${score.toFixed(2)} m/s`, classification: "Velocidade de marcha preservada", interpretation: "Velocidade acima de 0,8 m/s no protocolo histórico. Manter interpretação longitudinal e em conjunto com outros testes físicos.", clinicalColor: "verde" };
  } else if (code === "sentar_levantar_5x") result = numeric(raw, 180, CHAIR_STAND_5X_RANGES, "s");
  else if (code === "polifarmacia") result = numeric(raw, 7, POLYPHARMACY.ranges);
  else if (code === "stoppfall") result = numeric(raw, 14, STOPP_FALL.ranges);
  else if (code === "kps") {
    const score = requiredNumber(raw, "score", 10, 100);
    result = fromLegacy(scoreDiscreteNumeric({ raw: score, allowedValues: KPS_ALLOWED_VALUES, ranges: KPS.ranges, unit: "%" }));
  }
  else if (code === "lace") result = numeric(raw, 19, LACE.ranges);
  else if (code === "g8") result = numeric(raw, 17, G8.ranges);
  else if (code === "ves13") result = numeric(raw, 10, VES13.ranges);
  else if (code === "mna_sf") result = numeric(raw, 14, MNA_SF.ranges);
  else if (code === "charlson") result = numeric(raw, 40, CHARLSON_RANGES);
  else if (code === "fast") {
    const score = requiredNumber(raw, "score", 1, 7.6);
    result = fromLegacy(scoreDiscreteNumeric({ raw: score, allowedValues: FAST_ALLOWED_VALUES, ranges: FAST_RANGES }));
  } else if (code === "pps") {
    const score = requiredNumber(raw, "score", 10, 100);
    result = fromLegacy(scoreDiscreteNumeric({ raw: score, allowedValues: PPS_ALLOWED_VALUES, ranges: PPS_RANGES, unit: "%" }));
  } else result = numeric(raw, 90, ESAS.ranges);

  const answers = Object.fromEntries(
    definition.fields.map((field) => {
      const value = raw[field.id];
      if (typeof value !== "number" && typeof value !== "string") throw new Error(`Valor inválido para ${field.id}.`);
      return [field.id, value];
    }),
  );
  return { answers, result, version: definition.version };
}
