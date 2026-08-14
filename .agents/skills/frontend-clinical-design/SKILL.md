---
name: frontend-clinical-design
description: Projetar e revisar interfaces e documentos clínicos geriátricos do Prontuário, priorizando segurança, longitudinalidade, legibilidade, impressão A4, acessibilidade e continuidade do cuidado.
---

# Front-end Clinical Design — Prontuário Geriátrico

Use esta skill ao criar ou revisar:
- relatório da Avaliação Geriátrica Ampla;
- dashboards longitudinais;
- tabelas de escalas e medicamentos;
- telas de consulta e encerramento;
- documentos destinados a paciente, família, cuidadores, equipe multiprofissional ou outros médicos.

## 1. Princípio central

A interface existe para **reduzir carga cognitiva e melhorar continuidade do cuidado**. Elegância é consequência de hierarquia, clareza, consistência e espaço — nunca de ornamentação que esconda informação clínica.

## 2. Separação obrigatória

Nunca implementar ponto de corte, cálculo, regra clínica, classificação ou decisão terapêutica dentro de componente React.

Fluxo obrigatório:

`dados persistidos -> domínio clínico testado -> view model -> componente de apresentação`

O componente pode:
- agrupar;
- ordenar;
- rotular;
- formatar;
- ocultar/revelar progressivamente informação técnica.

O componente não pode:
- recalcular escala;
- reinterpretar escore;
- comparar versões incompatíveis;
- promover sugestão automática a conduta confirmada.

## 3. Hierarquia do relatório compartilhado

Ordem preferencial:

1. Identificação do paciente e contexto da consulta.
2. Resumo longitudinal: o que mudou desde a consulta anterior e desde a AGA inicial.
3. Alertas que exigem atenção.
4. Lista de problemas clínicos e geriátricos.
5. Dimensões da AGA, agrupadas.
6. Resultado atual das escalas e trajetória.
7. Plano de cuidado consolidado.
8. Orientações à família/cuidador.
9. Encaminhamentos.
10. Quando entrar em contato / urgência.
11. Apêndice técnico opcional: versão, fonte e dados coletados.

## 4. Longitudinalidade visual

Quando houver dados comparáveis, mostrar no mesmo contexto:

`baseline -> anterior -> atual`

Sempre exibir também um rótulo textual:
- tendência numérica favorável;
- estável numericamente;
- tendência numérica desfavorável;
- não comparável;
- dados insuficientes.

Nunca comunicar apenas por cor.

Mudança numérica não deve ser descrita como “clinicamente significativa” sem uma regra validada e documentada para o instrumento.

## 5. Dimensões

Agrupar escalas por:
- Funcionalidade
- Cognição
- Humor
- Fragilidade
- Mobilidade
- Nutrição
- Medicamentos
- Suporte social
- Oncogeriatria
- Prognóstico
- Sintomas
- Outros

A ordem deve priorizar entendimento clínico, não a ordem em que os campos foram preenchidos.

## 6. Linguagem por público

### Profissional de saúde
Pode exibir:
- nome da escala;
- escore;
- classificação;
- versão;
- trajetória;
- interpretação registrada;
- fonte.

### Paciente/família/cuidador
Preferir:
- frases curtas;
- significado funcional;
- ação prática;
- sinais de atenção;
- próximos passos.

Evitar jargão sem tradução.

## 7. Revisão humana

Sugestões derivadas automaticamente de escalas devem permanecer identificadas como sugestões até revisão médica.

Antes de imprimir/exportar um relatório compartilhável, a interface deve exigir confirmação explícita de revisão clínica.

Não usar finalização da consulta como sinônimo automático de revisão individual de cada sugestão se o sistema não persistir esse estado.

## 8. Design visual

### Tokens
- superfície principal clara;
- texto principal em alto contraste;
- cor de marca discreta;
- alertas com ícone/rótulo + cor;
- bordas suaves;
- raio moderado;
- sombras mínimas.

### Tipografia
- corpo: fonte de sistema legível;
- títulos: forte contraste de tamanho e peso;
- evitar corpo abaixo de 11pt em impressão;
- line-height generoso.

### Densidade
- resumir primeiro;
- detalhes depois;
- evitar cartões repetitivos de igual peso;
- preferir uma tabela longitudinal compacta dentro de cada dimensão.

## 9. Impressão A4

A impressão A4 retrato é superfície de primeira classe.

Obrigatório:
- margens definidas em `@page`;
- esconder controles;
- evitar corte de cabeçalhos e alertas;
- `break-inside: avoid` em blocos críticos;
- tabela com cabeçalho repetível;
- não depender de backgrounds para compreensão;
- URL, botões e navegação fora da impressão.

## 10. Acessibilidade

- navegação por teclado;
- foco visível;
- contraste suficiente;
- `aria-label` quando necessário;
- headings em ordem semântica;
- tabelas com `<th scope>`;
- texto equivalente para cores/status;
- estados de erro com `role="alert"`.

## 11. Estados vazios

Nunca inventar dado ausente.

Usar:
- “Sem dados registrados”
- “Não avaliado nesta consulta”
- “Dados insuficientes para comparação”
- “Versão não comparável”

Evitar preencher com zero quando zero não tiver sido medido.

## 12. Checklist de revisão

Antes de considerar uma tela/documento concluído:

- [ ] Não há regra clínica dentro de React.
- [ ] Paciente e consulta são inequívocos.
- [ ] Baseline, anterior e atual não se misturam.
- [ ] Versões incompatíveis não são comparadas.
- [ ] Problemas resolvidos continuam acessíveis no histórico.
- [ ] Alertas urgentes são visíveis e textuais.
- [ ] Sugestões automáticas continuam identificadas como sugestões.
- [ ] Relatório cabe e permanece legível em A4 retrato.
- [ ] Sem dado real em fixture, screenshot, snapshot ou Git.
- [ ] Cenário sem dados foi revisado.
- [ ] Acessibilidade por teclado foi revisada.
- [ ] Golden masters clínicos continuam verdes.
