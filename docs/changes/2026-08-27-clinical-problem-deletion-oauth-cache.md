# Correção de problemas longitudinais e cache do login

## Lista longitudinal de problemas

- títulos equivalentes são bloqueados após normalização de caixa, espaços e Unicode;
- problema resolvido continua disponível para reativação por mudança explícita de status;
- somente uma inclusão originada na consulta atual pode ser retirada;
- problemas herdados de consultas anteriores não podem ser excluídos;
- a retirada é lógica: `ClinicalProblem`, `ProblemEvent` e `AuditEvent` permanecem persistidos;
- o marcador operacional de retirada não aparece no SOAP, no relatório, no gráfico ou na lista clínica;
- não houve alteração de schema nem migration.

## Login Google

`/login` passa a ser explicitamente dinâmico (`force-dynamic`, `revalidate = 0`), impedindo que a CDN reutilize entre releases uma página de login antiga. O acesso continua usando o link navegável `/auth/google`, sem depender da hidratação do React.

## Release verificável

Identificador esperado no health check:

`2026-08-27-clinical-regression-fix-v1`

## Salvaguardas preservadas

- paciente e consulta continuam derivados no servidor;
- consultas históricas e finalizadas continuam imutáveis;
- exclusão física de problema não foi introduzida;
- nenhuma regra de escala, SOAP, vacinação, orientação familiar, gráfico ou medicamento foi modificada;
- nenhuma informação clínica real foi adicionada a teste ou documentação.
