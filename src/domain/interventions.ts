import type { ClinicalColor } from "./clinical-engine.ts";

export interface InterventionPlan {
  agora: string[];
  medio: string[];
  cuidador: string[];
  encaminhamentos: string[];
  contato: string[];
  urgencia: string[];
}

export type InterventionFragment = Partial<InterventionPlan>;
export type InterventionByColor = Partial<
  Record<Exclude<ClinicalColor, "cinza">, InterventionFragment>
>;

function unique(items: readonly string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const item of items) {
    const normalized = item.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    output.push(normalized);
  }
  return output;
}

export function emptyInterventionPlan(): InterventionPlan {
  return {
    agora: [],
    medio: [],
    cuidador: [],
    encaminhamentos: [],
    contato: [],
    urgencia: [],
  };
}

export function mergeInterventionPlans(
  ...fragments: InterventionFragment[]
): InterventionPlan {
  const base = emptyInterventionPlan();
  for (const fragment of fragments) {
    for (const key of Object.keys(base) as (keyof InterventionPlan)[]) {
      base[key].push(...(fragment[key] ?? []));
    }
  }
  for (const key of Object.keys(base) as (keyof InterventionPlan)[]) {
    base[key] = unique(base[key]);
  }
  return base;
}

/**
 * Primeira extração validada do objeto INTERVENCOES do legado.
 * A engine de cálculo não conhece estas orientações; a separação é deliberada.
 */
export const LEGACY_INTERVENTIONS: Record<string, InterventionByColor> = {
  lawton: {
    vermelho: {
      agora: [
        "Acompanhe mais de perto as contas e os medicamentos, mantendo a pessoa informada e participando das decisões sempre que possível.",
        "Uma caixa semanal pode facilitar os horários dos medicamentos. Deixe uma pessoa de confiança responsável por conferir o preenchimento e as doses.",
      ],
      medio: ["Terapia ocupacional para adaptar tarefas domésticas e treinar rotinas com apoio."],
      cuidador: ["Uma rotina visual simples, em local fácil de ver, pode ajudar a lembrar horários de medicamentos, refeições e outras atividades do dia."],
      encaminhamentos: ["Terapia ocupacional", "Serviço social"],
    },
    amarelo: {
      agora: ["Simplificar o que já está difícil: caixa semanal de remédios, débito automático das contas fixas e lista de compras pronta."],
      medio: ["Reavaliar em 3 meses quais atividades continuam sendo feitas sozinho, para detectar perdas novas cedo."],
      encaminhamentos: ["Terapia ocupacional"],
    },
  },
  pfeffer: {
    vermelho: {
      agora: [
        "Se já houve erros com fogão, dinheiro ou medicamentos, mantenha uma pessoa de confiança por perto nessas tarefas até a reavaliação.",
        "Se houver risco de se perder ao sair de casa, combine companhia nos trajetos e use uma identificação discreta com nome e telefone de contato.",
      ],
      medio: ["Investigação de causa do declínio funcional e reabilitação cognitiva."],
      cuidador: ["Uma rotina previsível e um ambiente organizado podem trazer mais segurança; avise mudanças com antecedência sempre que possível."],
      encaminhamentos: ["Terapia ocupacional", "Neuropsicologia"],
    },
    amarelo: {
      agora: ["Acompanhe de perto medicamentos e finanças se já houver erros ou insegurança nessas tarefas."],
      encaminhamentos: ["Terapia ocupacional"],
    },
  },
  barthel: {
    vermelho: {
      agora: [
        "Cuide da pele e das áreas de pressão, com mudanças de posição e os recursos adequados à rotina da pessoa para reduzir o risco de feridas.",
        "Ajuste cama e cadeira para facilitar transferências confortáveis e seguras.",
      ],
      medio: ["Programa de reabilitação motora contínuo, com metas funcionais definidas por escrito."],
      cuidador: ["Peça ao fisioterapeuta que ensine uma forma de transferência confortável e segura para a pessoa e para quem ajuda."],
      encaminhamentos: ["Fisioterapia", "Terapia ocupacional", "Enfermagem"],
    },
    amarelo: {
      agora: ["Adapte o ambiente para que a pessoa continue fazendo, com segurança, as atividades que ainda consegue realizar sozinha."],
      encaminhamentos: ["Fisioterapia"],
    },
  },
  g8: {
    vermelho: {
      agora: ["Rastreio positivo: está indicada a Avaliação Geriátrica Ampla completa antes de definir o tratamento oncológico."],
      medio: ["Reavaliar durante o tratamento, pois o estado de saúde muda ao longo dos ciclos."],
      encaminhamentos: ["Geriatria / Oncogeriatria"],
    },
  },
  apgar_familiar: {
    vermelho: {
      agora: [
        "Escolha uma pessoa de referência para acompanhar consultas e ajudar a organizar o cuidado quando for necessário.",
        "O serviço social pode ajudar a identificar pessoas, serviços e benefícios que possam apoiar a família no cuidado.",
      ],
      medio: ["Se fizer sentido para a pessoa, grupos de convivência, centro-dia ou atividades comunitárias podem ampliar o contato social e reduzir o isolamento."],
      encaminhamentos: ["Serviço social", "Psicologia"],
      contato: ["Sobrecarga da família ou dificuldade em manter o cuidado combinado."],
      urgencia: ["Suspeita de maus-tratos, negligência, violência ou abuso financeiro: Disque 100 (24 horas, gratuito) ou Delegacia do Idoso."],
    },
    amarelo: {
      agora: ["Converse em família sobre como dividir as tarefas para que o cuidado não fique concentrado em uma só pessoa."],
      encaminhamentos: ["Serviço social"],
    },
  },
  zarit_reduzida: {
    vermelho: {
      agora: [
        "Reserve períodos regulares de descanso para quem cuida e combine com antecedência quem poderá assumir o cuidado nesses momentos.",
        "Divida as tarefas entre familiares ou pessoas próximas de forma clara; deixar essa combinação por escrito pode facilitar a rotina.",
      ],
      medio: [
        "Apoio psicológico ao cuidador e participação em grupo de apoio.",
        "Avaliar cuidador formal, centro-dia ou serviço de apoio domiciliar.",
      ],
      cuidador: ["Quem cuida também precisa de descanso, apoio e tempo para a própria saúde. Dividir responsabilidades ajuda a sustentar o cuidado por mais tempo."],
      encaminhamentos: ["Psicologia", "Serviço social"],
    },
    amarelo: {
      agora: ["Programe pausas regulares para quem cuida e divida as tarefas entre as pessoas disponíveis."],
      encaminhamentos: ["Serviço social"],
    },
  },
  charlson: {
    vermelho: {
      agora: [
        "Otimizar o controle de cada doença crônica antes de procedimentos ou tratamentos de maior porte.",
        "Levar a lista atualizada de doenças e medicamentos a todas as consultas e ao pronto-socorro.",
      ],
      medio: ["Definir com o médico as prioridades de tratamento e as metas de cuidado, considerando o conjunto das doenças e não cada uma isoladamente."],
      encaminhamentos: ["Coordenação de cuidado interdisciplinar"],
    },
    amarelo: {
      agora: ["Manter o acompanhamento regular de cada condição crônica."],
      encaminhamentos: [],
    },
  },
  ves13: {
    vermelho: {
      agora: ["Rastreio positivo para vulnerabilidade: indicada avaliação geriátrica completa e plano de cuidado individualizado."],
      encaminhamentos: ["Geriatria / Oncogeriatria"],
    },
  },
  mna_sf: {
    vermelho: {
      agora: [
        "Se refeições grandes cansarem ou reduzirem a aceitação, ofereça porções menores distribuídas ao longo do dia.",
        "Inclua fontes de proteína nas refeições de acordo com a alimentação habitual, como ovos, carnes, peixes, leite, queijo ou feijão.",
        "Evite retirar vários alimentos de uma vez quando há risco nutricional. Restrições devem ter um motivo claro e ser ajustadas para que a alimentação continue suficiente e prazerosa.",
      ],
      medio: [
        "Avaliação com nutricionista para plano individualizado e decisão sobre suplemento.",
        "Avaliação odontológica se houver dor ao mastigar ou prótese mal adaptada.",
      ],
      cuidador: ["Valorize alimentos de que a pessoa gosta, com boa apresentação e temperatura agradável. Quando ela gostar de companhia, fazer a refeição junto pode tornar esse momento mais prazeroso."],
      encaminhamentos: ["Nutrição", "Odontologia", "Fonoaudiologia"],
      contato: [
        "Engasgo frequente, tosse durante as refeições ou voz molhada depois de beber água.",
        "Procure a equipe se houver recusa persistente de alimentos ou redução importante da ingestão.",
      ],
    },
    amarelo: {
      agora: ["Quando for possível pesar com segurança, acompanhe o peso periodicamente e anote mudanças importantes para compartilhar na consulta."],
      medio: ["Avaliação nutricional preventiva."],
      encaminhamentos: ["Nutrição"],
      contato: ["Procure a equipe se a perda de peso continuar ou se a alimentação estiver ficando cada vez mais difícil."],
    },
  },
  polifarmacia: {
    vermelho: {
      agora: [
        "Na próxima consulta, leve todas as caixas de medicamentos, vitaminas e outros produtos usados em casa, inclusive os que foram suspensos recentemente.",
        "Uma caixa semanal com divisões por horário pode facilitar a rotina de medicamentos quando for adequada para aquela prescrição.",
        "Se houver dúvida sobre algum medicamento ou vontade de suspender algo, converse com o médico antes para planejar a mudança com segurança.",
      ],
      medio: [
        "Revisão formal da prescrição com desprescrição planejada e, quando disponível, apoio de farmacêutico clínico.",
        "Reavaliar as doses conforme a função dos rins e do fígado.",
      ],
      cuidador: ["Mantenha uma lista atualizada dos medicamentos no celular ou na bolsa para ter essa informação disponível em qualquer atendimento."],
      encaminhamentos: ["Farmácia clínica"],
      contato: [
        "Tontura ao levantar, quedas, sonolência excessiva ou confusão nova podem estar relacionadas aos medicamentos. Se isso acontecer, procure a equipe antes de mudar qualquer dose.",
        "Avise a equipe quando outro profissional iniciar um medicamento novo, para manter a lista e as combinações atualizadas.",
      ],
    },
    amarelo: {
      agora: ["Revisar a lista completa de medicamentos na próxima consulta e simplificar horários sempre que possível."],
    },
  },
  sarcf: {
    vermelho: {
      agora: [
        "Iniciar treino de força (exercício resistido) para membros superiores e inferiores, 2 a 3 vezes por semana, com carga progressiva — é a intervenção com maior evidência de benefício em sarcopenia (EWGSOP2).",
        "Se ainda não realizados nesta avaliação, confirmar com força de preensão palmar ou teste de sentar-levantar 5 vezes.",
      ],
      medio: [
        "Avaliação nutricional com ingestão de proteína em torno de 1,0 a 1,2 g por quilo de peso ao dia (ajustar se houver doença renal), e dosagem de vitamina D com reposição se deficiente.",
        "Investigar causas secundárias — inatividade física, doença inflamatória, neoplasia, insuficiência de órgão ou doença neurológica — já que a sarcopenia pode sinalizar outra condição de base, além do envelhecimento isolado (EWGSOP2).",
        "Se disponível, considerar avaliação de massa muscular (DXA ou bioimpedância) e de desempenho físico (velocidade de marcha ou SPPB) para confirmar o diagnóstico e classificar a gravidade.",
      ],
      cuidador: [
        "Estimular caminhadas e atividades que exijam força (levantar, carregar objetos leves) no dia a dia, sem forçar além da tolerância — e ficar atento a quedas, que se tornam mais prováveis com a sarcopenia.",
      ],
      encaminhamentos: ["Fisioterapia", "Nutrição"],
    },
  },
  velocidade_marcha: {
    vermelho: {
      agora: [
        "Caminhar 20 minutos, 5 vezes por semana, em piso plano e com calçado fechado, de solado fino e antiderrapante. Se 20 minutos for muito, começar com 10 e aumentar 2 minutos por semana.",
      ],
      medio: [
        "Treino de força de pernas (agachamento apoiado na cadeira, subir degrau) 2 vezes por semana, orientado por fisioterapeuta ou educador físico.",
      ],
      encaminhamentos: ["Fisioterapia", "Educador físico"],
      contato: ["Piora rápida da caminhada em poucas semanas, sem explicação."],
    },
    amarelo: {
      agora: ["Manter caminhada regular de 20 a 30 minutos, 5 vezes por semana."],
      encaminhamentos: ["Educador físico"],
    },
  },
  sentar_levantar_5x: {
    vermelho: {
      agora: [
        "Exercício de levantar e sentar da cadeira: 3 séries de 8 repetições, 3 vezes por semana, com a cadeira encostada na parede e alguém por perto nas primeiras semanas.",
      ],
      medio: [
        "Treino de força resistido supervisionado 2 a 3 vezes por semana.",
        "Garantir ingestão de proteína em todas as refeições (carne, ovo, leite, queijo, feijão), conforme orientação do nutricionista.",
      ],
      encaminhamentos: ["Fisioterapia", "Nutrição"],
    },
    amarelo: {
      agora: ["Manter exercício de levantar da cadeira 2 vezes por semana."],
      encaminhamentos: ["Educador físico"],
    },
  },
  preensao: {
    vermelho: {
      agora: [
        "Iniciar treino de força para membros superiores e inferiores 2 a 3 vezes por semana, com carga progressiva.",
      ],
      medio: [
        "Avaliação nutricional com atenção à ingestão de proteína (alvo habitual de 1,0 a 1,2 g por quilo de peso ao dia, ajustado pelo médico se houver doença renal).",
      ],
      encaminhamentos: ["Fisioterapia", "Nutrição"],
    },
    amarelo: {
      agora: ["Manter atividade física com componente de força."],
      encaminhamentos: ["Educador físico"],
    },
  },
  sppb: {
    vermelho: {
      agora: [
        "Iniciar fisioterapia com treino de equilíbrio, marcha e força, 2 a 3 vezes por semana.",
      ],
      medio: ["Reavaliar o SPPB em 3 meses para medir o ganho de forma objetiva."],
      encaminhamentos: ["Fisioterapia"],
    },
    amarelo: {
      agora: [
        "Incluir exercícios de equilíbrio (apoio em um pé segurando a bancada, 3 séries de 10 segundos por perna, diariamente).",
      ],
      encaminhamentos: ["Educador físico"],
    },
  },
  fast: {
    vermelho: {
      agora: [
        "Adequar o ambiente para reduzir riscos e manter rotina previsível.",
        "Organize o apoio diário e registre preferências importantes de cuidado enquanto a pessoa ainda consegue expressá-las com clareza.",
      ],
      medio: [
        "Terapia ocupacional para adaptar tarefas e orientar o cuidador.",
        "Converse sobre o cansaço de quem cuida e sobre a possibilidade de revezamento ou apoio domiciliar quando a rotina estiver pesada.",
        "À medida que a dependência aumenta, fique atento à pele e a sinais de dificuldade para engolir para que esses cuidados sejam discutidos cedo.",
      ],
      encaminhamentos: ["Terapia ocupacional", "Fisioterapia", "Fonoaudiologia", "Cuidados paliativos"],
      contato: ["Perda funcional abrupta ou fora da sequência habitual merece investigação de causa aguda."],
    },
    amarelo: {
      agora: ["Acompanhe mais de perto finanças, medicamentos e direção se essas atividades já estiverem trazendo erros ou insegurança."],
      medio: ["Investigar causas reversíveis e reavaliar o estágio funcional periodicamente."],
      encaminhamentos: ["Terapia ocupacional", "Neuropsicologia"],
    },
  },
  esas: {
    vermelho: {
      agora: ["Priorizar o controle dos sintomas mais intensos e revisar cada sintoma individualmente."],
      medio: ["Reaplicar a ESAS para acompanhar resposta ao controle sintomático."],
      encaminhamentos: ["Cuidados paliativos"],
      contato: ["Qualquer sintoma que alcance nota 7 ou mais requer revisão clínica sem aguardar a próxima consulta de rotina."],
    },
    amarelo: {
      agora: ["Escolher os sintomas que mais incomodam e tratá-los de forma prioritária."],
      medio: ["Reaplicar a escala nas consultas seguintes."],
      encaminhamentos: ["Cuidados paliativos"],
    },
  },

  lace: {
    vermelho: {
      agora: [
        "Agendar contato telefônico ou visita em até 7 a 14 dias após a alta hospitalar.",
        "Revisar a lista de medicamentos com o médico logo após a alta — é o período de maior risco de erro e interação medicamentosa.",
      ],
      medio: [
        "Manter acompanhamento próximo (presencial ou telefônico) nas primeiras semanas após a internação, atento a sinais precoces de piora.",
      ],
      encaminhamentos: ["Coordenação de cuidado interdisciplinar"],
      contato: [
        "Qualquer sinal de piora, febre, confusão nova ou dificuldade em seguir as orientações da alta.",
      ],
    },
    amarelo: {
      agora: ["Confirmar consulta de retorno em até 2 a 3 semanas após a alta."],
      encaminhamentos: [],
    },
  },
};

export function interventionFor(
  scaleId: string,
  color: ClinicalColor,
): InterventionPlan {
  if (color === "cinza") return emptyInterventionPlan();
  return mergeInterventionPlans(LEGACY_INTERVENTIONS[scaleId]?.[color] ?? {});
}

export function buildCombinedPlan(
  results: readonly { scaleId: string; color: ClinicalColor }[],
): InterventionPlan {
  return mergeInterventionPlans(
    ...results.map(({ scaleId, color }) => interventionFor(scaleId, color)),
  );
}
