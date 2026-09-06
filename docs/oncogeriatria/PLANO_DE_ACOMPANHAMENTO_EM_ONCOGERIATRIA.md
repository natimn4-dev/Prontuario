# PLANO DE ACOMPANHAMENTO EM ONCOGERIATRIA

> Fonte: documento clínico-funcional fornecido pela Product Owner em 06/09/2026. Esta versão Markdown preserva o conteúdo do documento para versionamento no repositório principal do Prontuário Aprimorado.

## 1. Visão do produto

Desenvolver, dentro do Prontuário Aprimorado, um módulo específico de oncogeriatria destinado ao acompanhamento longitudinal, multidimensional e multiprofissional da pessoa idosa com câncer.

O módulo deverá permitir que os profissionais acompanhem a trajetória clínica e geriátrica do paciente antes, durante e após o tratamento oncológico, integrando em uma única visão:

- doença e tratamento oncológico;
- risco de toxicidade;
- Avaliação Geriátrica Ampla;
- funcionalidade;
- mobilidade;
- fragilidade;
- cognição;
- humor;
- nutrição e vitalidade;
- disfagia;
- sintomas;
- visão e audição;
- medicamentos;
- risco de quedas;
- suporte familiar e social;
- intercorrências;
- hospitalizações;
- evolução longitudinal.

O sistema não deverá funcionar apenas como repositório de escalas. Seu principal objetivo será construir um **Mapa Oncogeriátrico Longitudinal**, capaz de mostrar de forma rápida quais dimensões permanecem estáveis, quais apresentaram deterioração e quais necessitam de avaliação mais detalhada.

## 2. Objetivo assistencial

Transformar os dados coletados pela equipe em informações clinicamente úteis e facilmente visualizáveis, favorecendo:

- identificação precoce de vulnerabilidades;
- acompanhamento de mudanças durante o tratamento;
- comunicação entre os profissionais;
- comparação entre avaliações;
- reconhecimento de deterioração funcional ou clínica;
- direcionamento das avaliações complementares;
- planejamento multiprofissional;
- produção de relatório compreensível para paciente e família.

O sistema deverá apoiar o raciocínio clínico, sem substituir a decisão dos profissionais.

## 3. População elegível

O programa deverá contemplar pacientes com idade superior a 65 anos ou pacientes identificados pela Ferramenta de Triagem Geriátrica G8 como potencialmente beneficiários de Avaliação Geriátrica Ampla.

A regra deverá ser configurável para eventual alteração institucional futura.

## 4. Estrutura longitudinal

O acompanhamento deverá estar relacionado a um episódio oncológico específico.

**Estrutura:**

Paciente → Episódio oncológico → Tratamento → Marco do tratamento → Avaliação oncogeriátrica

Deverão ser possíveis avaliações:

- antes do início do tratamento;
- durante o tratamento;
- após ciclos de quimioterapia;
- durante radioterapia, conforme os marcos definidos pelo tratamento;
- após mudança relevante de esquema terapêutico;
- após intercorrência clínica relevante;
- ao término do tratamento;
- após seis meses;
- após um ano;
- em outros momentos definidos pela equipe.

## 5. Equipe multiprofissional

O módulo deverá ser construído para participação integrada de:

- oncologista/onco-hematologista;
- geriatra;
- enfermagem e navegação;
- fisioterapia;
- nutrição;
- psicologia;
- serviço social;
- farmácia;
- fonoaudiologia, quando envolvida no cuidado.

Todos deverão trabalhar sobre o mesmo episódio clínico e visualizar o mesmo mapa longitudinal, mantendo-se registrada a autoria de cada avaliação.

## 6. Dados oncológicos

A área inicial do episódio deverá apresentar:

- diagnóstico oncológico;
- data do diagnóstico;
- tumor sólido ou hematológico;
- sítio primário;
- estágio;
- oncologista/onco-hematologista assistente;
- tratamento atual;
- linha de tratamento;
- fase do tratamento;
- ciclos ou marcos realizados;
- tratamento anterior;
- risco de toxicidade relacionado ao tratamento;
- intercorrências relevantes.

## 7. Avaliação do risco de toxicidade

O sistema deverá permitir aplicação e cálculo da CARG/Hurria, com registro estruturado dos fatores utilizados no cálculo.

O resultado deverá apresentar:

- pontuação;
- categoria de risco;
- data da avaliação;
- tratamento ao qual a avaliação está vinculada;
- fatores responsáveis pela pontuação.

O resultado deverá integrar o Mapa Oncogeriátrico e o relatório final.

A CARG deverá servir como instrumento de estratificação de risco e não deverá gerar automaticamente indicação de redução de dose, mudança de tratamento ou suspensão de terapia.

## 8. Avaliação Geriátrica Ampla

| Dimensão | Avaliações previstas |
|---|---|
| Funcionalidade | Katz, Barthel, Lawton, Pfeffer |
| Locomoção | força de preensão, levantar e sentar cinco vezes, desempenho físico |
| Fragilidade | Fenótipo de Fried e instrumentos definidos no prontuário |
| Nutrição | MNA-SF, peso, perda ponderal e ingestão |
| Sarcopenia | SARC-F |
| Disfagia | EAT-10 |
| Cognição | MEEM, 10-CS, MoCA |
| Humor | GDS-15 |
| Sensorial | visão e audição |
| Performance | ECOG e Karnofsky |
| Comorbidades | Charlson |
| Social/familiar | APGAR Familiar e suporte social |
| Medicamentos | polifarmácia, Beers e STOPPFall |
| Sintomas e qualidade de vida | ESAS — Escala de Avaliação de Sintomas de Edmonton |
| Quedas | quedas, quase quedas, marcha e dispositivos auxiliares |
| Continência | avaliação urinária e fecal |

A seleção do instrumento a ser aplicado permanecerá sob responsabilidade do profissional.

## 9. Consultas subsequentes

Para viabilizar o acompanhamento longitudinal e a construção dos gráficos sem tornar as consultas subsequentes excessivamente extensas, cada avaliação deverá iniciar por um rastreio das dimensões geriátricas. Quando o rastreio identificar alteração, o sistema deverá oferecer acesso imediato às escalas relacionadas àquela dimensão para reavaliação. Quando o rastreio tiver sido concluído e não identificar modificação, o valor numérico da avaliação anterior deverá ser mantido na série longitudinal, identificado tecnicamente como **“valor mantido por rastreio sem alteração”**, e não como nova aplicação da escala. Quando a dimensão não tiver sido adequadamente rastreada, deverá ser registrada como **“não avaliada”**, sem manutenção automática do resultado anterior.

Nas consultas subsequentes, não será necessário reaplicar indiscriminadamente todas as escalas da avaliação inicial.

Inicialmente será realizado um rastreio de mudança em cada dimensão, respondendo:

> “Houve mudança clínica ou funcional relevante desde a última avaliação?”

### 9.1. Quando o rastreio indicar alteração

Se houver mudança em determinada dimensão, o sistema deverá:

1. destacar visualmente a dimensão alterada;
2. informar qual alteração foi identificada;
3. disponibilizar imediatamente as escalas relacionadas àquela dimensão;
4. permitir iniciar a reavaliação com um único comando;
5. registrar o novo resultado;
6. substituir o valor longitudinal anterior pelo novo resultado a partir daquela data.

**Exemplo:**

Rastreio de mobilidade: ☑ Queda desde a última avaliação.

O sistema deverá apresentar imediatamente:

**Mobilidade — alteração identificada**

Avaliações disponíveis: desempenho físico, teste de levantar da cadeira, força de preensão e demais instrumentos relacionados.

**[Reavaliar mobilidade]** → link para as mesmas escalas preenchidas na consulta anterior.

O profissional não deverá precisar sair da consulta ou procurar manualmente as escalas em outra área do prontuário.

## 10. Quando não houver alteração no rastreio

Quando o rastreio de determinada dimensão tiver sido efetivamente realizado e não houver indicação de mudança, deverá ser mantido, para fins de continuidade longitudinal e construção dos gráficos, o mesmo valor numérico registrado na avaliação anterior.

**Exemplo:**

Consulta anterior: Barthel 90 pontos.

Consulta atual: Rastreio funcional sem nova dependência em atividades básicas.

Para a série longitudinal: **Barthel: 90 → 90**.

Entretanto, o sistema deverá diferenciar claramente:

- valor obtido por aplicação da escala; e
- valor mantido porque o rastreio não identificou mudança.

Essa distinção é obrigatória para preservar a rastreabilidade clínica.

## 11. Regra de procedência dos valores

Cada ponto utilizado no gráfico longitudinal deverá possuir uma classificação interna.

### Valor mensurado

A escala foi efetivamente aplicada naquela data.

Exemplo: `10/08/2026 — Barthel 90 — Escala aplicada.`

### Valor mantido por rastreio

A escala não foi reaplicada, mas o rastreio da dimensão foi realizado e não identificou alteração.

Exemplo: `02/09/2026 — Barthel 90 — Valor mantido. Rastreio funcional sem alteração.`

Dessa forma, é possível manter a continuidade gráfica sem criar a falsa informação de que o instrumento foi novamente aplicado.

## 12. Situação diferente: dimensão não avaliada

O sistema deverá distinguir três situações:

1. **Escala reaplicada:** existe novo resultado.
2. **Rastreio realizado sem alteração:** o resultado anterior pode ser mantido para representação longitudinal.
3. **Rastreio não realizado ou impossível de concluir:** registrar **Não avaliado**.

No terceiro cenário, não deverá ocorrer transporte automático do valor anterior. Essa regra evita que falta de informação seja confundida com estabilidade.

## 13. Eventos que deverão facilitar a reavaliação de uma dimensão

O rastreio entre ciclos deverá incluir pelo menos:

### Funcionalidade
- nova necessidade de ajuda em AIVD;
- nova necessidade de ajuda em ABVD.

### Mobilidade
- queda;
- quase queda;
- novo dispositivo de marcha;
- piora percebida da mobilidade.

### Nutrição
- peso;
- perda de peso;
- redução da ingestão;
- anorexia;
- náusea;
- disfagia;
- mucosite.

### Cognição
- confusão;
- delirium;
- piora cognitiva percebida;
- nova dificuldade para organizar ou utilizar medicamentos;
- dificuldade para gestão financeira.

### Sintomas
Aplicação ou atualização da ESAS quando indicada.

### Eventos assistenciais
- atendimento de emergência;
- hospitalização;
- infecção;
- interrupção do tratamento;
- atraso de ciclo;
- motivo do atraso;
- redução de dose registrada pelo oncologista.

Uma alteração identificada deverá permitir acesso imediato às avaliações relacionadas.

## 14. Associação automática entre rastreio e dimensão

O sistema deverá conhecer a relação entre cada achado de rastreio e os respectivos domínios.

Exemplos:

- Queda → Mobilidade / risco de queda / funcionalidade
- Perda ponderal → Nutrição / vitalidade
- Disfagia → Nutrição / deglutição
- Confusão → Cognição
- Nova dependência em ABVD → Katz ou Barthel
- Nova dependência em AIVD → Lawton ou Pfeffer
- Piora da audição → Domínio sensorial
- Check box indicando ou não perda visual ou auditiva; uso de óculos? aparelho auditivo?

A associação deverá abrir possibilidades de avaliação, e não aplicar ou preencher escalas automaticamente.

## 15. Fluxo ideal da consulta subsequente

1. Selecionar tratamento/ciclo
2. Realizar rastreio das dimensões
3. Sistema identifica dimensões com e sem alteração
4. Dimensões sem alteração mantêm o último valor longitudinal, identificado como “mantido por rastreio”
5. Dimensões alteradas apresentam acesso imediato às escalas correspondentes
6. Profissional seleciona e aplica a avaliação necessária
7. Novo resultado alimenta o mapa e os gráficos
8. Relatório longitudinal é atualizado

## 16. Mapa Oncogeriátrico

A tela principal deverá apresentar as diferentes dimensões de maneira resumida.

| Dimensão | Situação | Evolução |
|---|---|---|
| Funcionalidade | Preservada | Estável |
| Mobilidade | Alterada | Piora |
| Nutrição | Atenção | Piora |
| Cognição | Preservada | Estável |
| Humor | Preservado | Estável |
| Sensorial | Atenção | Estável |

A equipe deverá conseguir compreender o estado global do paciente sem precisar abrir todas as escalas.

## 17. Gráficos longitudinais

Os gráficos deverão mostrar a evolução ao longo do tratamento.

Cada ponto deverá permitir identificar:

- data;
- consulta;
- ciclo ou marco terapêutico;
- instrumento;
- valor;
- interpretação;
- se houve reaplicação;
- se o valor foi mantido a partir do rastreio.

A representação visual deverá distinguir esses dois tipos de dado.

Exemplo:

- ● escala aplicada
- ○ valor mantido por rastreio sem alteração

Assim, a continuidade do gráfico é preservada, mas a origem da informação permanece transparente.

Nos pontos de inflexão dos gráficos, fazer correlação com possíveis causas, como internamento, infecção e toxicidade da quimioterapia.

## 18. Troca de instrumento

Se diferentes escalas forem utilizadas para avaliar uma mesma dimensão, os escores brutos não deverão ser tratados como se fossem numericamente equivalentes.

Exemplo: Barthel 80 e Katz 4 não podem formar uma única sequência numérica.

O sistema deverá preservar:

- série do instrumento;
- estado clínico da dimensão;
- data da mudança de instrumento.

O mapa do domínio poderá continuar mostrando a trajetória geral, enquanto o gráfico da escala mantém apenas resultados comparáveis.

Por esse motivo, indicar nas consultas subsequentes as escalas previamente preenchidas.

## 19. Medicamentos

A área de medicamentos deverá utilizar os registros já existentes no Prontuário Aprimorado.

Deverão ser possíveis análises relacionadas a:

- polifarmácia;
- critérios de Beers;
- STOPPFall;
- risco associado a quedas.

O sistema poderá destacar medicamentos para revisão pelo profissional, porém não poderá produzir automaticamente comandos como “Suspender este medicamento.” A decisão permanecerá clínica.

## 20. Relatório final para paciente e família

O relatório deverá ser produzido a partir das informações consolidadas no módulo e conter:

### Identificação e situação oncológica
- diagnóstico;
- tratamento;
- fase do tratamento.

### Avaliação de risco
- resultado da CARG;
- categoria correspondente.

### Evolução global
Mapa simplificado das dimensões:

- funcionalidade;
- mobilidade;
- nutrição;
- cognição;
- humor;
- sintomas;
- visão/audição;
- outras dimensões relevantes.

### Mudanças desde a avaliação anterior
Devem ser mostradas de forma prioritária.

Exemplo: “Mobilidade: houve piora desde a última avaliação, com relato de queda e redução do desempenho físico.”

### Domínios estáveis
Poderão ser apresentados de forma resumida.

Exemplo: “Cognição: não foram identificadas novas alterações no rastreio realizado nesta avaliação.”

Não é necessário informar ao paciente que determinado número foi “transportado” no banco de dados.

## 21. Orientações relacionadas aos domínios alterados

As orientações deverão ser apresentadas somente quando pertinentes aos achados.

Poderão incluir:

- atividade física;
- fisioterapia;
- treino de equilíbrio;
- prevenção de quedas;
- suporte nutricional;
- orientação sobre disfagia;
- adaptação ambiental;
- comunicação adequada diante de redução auditiva;
- adaptações diante de redução visual;
- estímulo cognitivo;
- rotina;
- engajamento social;
- preservação da autonomia;
- orientação ao cuidador.

O relatório não deverá incluir automaticamente condutas privativas do profissional, como prescrição, suspensão de medicamentos ou alteração do tratamento oncológico.

## 22. Requisitos centrais de experiência de uso

O módulo deverá seguir quatro princípios:

1. **Rastrear primeiro, aprofundar quando necessário.** A consulta subsequente não deverá exigir reaplicação indiscriminada de todas as escalas.
2. **Alteração identificada = acesso imediato à avaliação relacionada.** O profissional não deverá procurar manualmente a escala.
3. **Ausência de alteração = manutenção longitudinal controlada.** O último valor poderá alimentar a continuidade do gráfico, desde que esteja identificado como valor mantido após rastreio sem alteração.
4. **Ausência de rastreio ≠ estabilidade.** Se a dimensão não foi avaliada, deverá constar “não avaliada”.
