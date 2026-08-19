# Workspace longitudinal de problemas

## Objetivo

Tornar operacional a lista clínica + geriátrica na própria consulta, preservando o estado histórico usado por SOAP, relatório e evolução longitudinal.

## Regras

- o paciente é sempre derivado da consulta no servidor;
- a lista exibida em consulta histórica é reconstruída pelo horizonte temporal;
- problemas resolvidos permanecem visíveis no histórico;
- alterações só são permitidas na consulta cronologicamente mais recente e enquanto ela não estiver finalizada;
- criação gera `ClinicalProblem` + primeiro `ProblemEvent` de forma atômica;
- mudança de estado usa compare-and-set e cria `ProblemEvent` com estado anterior/novo;
- todas as escritas usam transação `Serializable` e evento de auditoria sem conteúdo clínico.

## UX

A página da consulta mostra duas colunas: problemas clínicos e geriátricos. Os sete I's geriátricos aparecem apenas como atalhos de preenchimento do título; clicar em um atalho não cria nem diagnostica automaticamente.

Quando a lista muda, o SOAP atualiza sua seção A/P apenas se não houver rascunho local não salvo. Com rascunho pendente, a interface avisa sobre a divergência e não sobrescreve o texto digitado.
