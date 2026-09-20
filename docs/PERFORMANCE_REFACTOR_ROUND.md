# Rodada de performance estrutural

## Escopo

Esta rodada reduz trabalho redundante no fluxo clínico sem alterar regras de escalas, pontos de corte, interpretações, conteúdo assistencial ou salvaguardas de persistência.

## Observabilidade segura

As rotas clínicas instrumentadas usam `CLINICAL_PERFORMANCE_LOGGING=1`. Cada registro contém apenas `requestId`, nome operacional da rota, duração total, quantidade e duração agregada de operações Prisma, quantidade e duração agregada de transações, resultado e status HTTP. O listener Prisma não registra SQL, parâmetros, corpos de requisição ou resposta.

O script `npm run performance:baseline` mede duração HTTP e status para leituras e, apenas quando explicitamente habilitado com fixture sintética, para escritas. Ele nunca imprime corpos de resposta. Sem MariaDB, servidor autenticado e paciente sintético disponíveis no ambiente local, a tabela da entrega deve marcar essas métricas como não medidas, em vez de inventar p95.

## Escopo transacional do SOAP

`saveConsultationNote()` mantém `Serializable`, a checagem de `expectedNoteVersion`, o bloqueio de consultas finalizadas, a validação de problemas, a persistência de exames e o `auditEvent`. A leitura completa do contexto continua antes da escrita dentro da mesma transação porque fornece a base necessária para validar o horizonte, problemas e concorrência. Depois da escrita não há segunda chamada a `noteContext()`; a resposta reaproveita o contexto validado e lê somente `updatedAt` quando o caminho de concorrência exige.

Essa decisão reduz queries e duração sem transformar a operação em uma sequência não atômica. Um próximo ajuste de isolamento só pode ocorrer com evidência de saturação/conflitos e testes de concorrência.

## Conexões MariaDB

`DATABASE_CONNECTION_LIMIT` é configurável por ambiente, com fallback 5 e teto de segurança 10 no código. Nenhum aumento de produção é assumido nesta rodada: a operação deve observar saturação, fila e limites do banco antes de alterar o valor.

## Autenticação

`cookieCache.enabled=false` e `disableCookieCache=true` permanecem inalterados. A redução de fan-out foi feita compartilhando o registro de consulta retornado por `requireConsultationAccess()` dentro do mesmo request e removendo guardas externos duplicados em rotas cujo serviço já autoriza a consulta. Revogação de sessão e validação de vínculo paciente-profissional continuam ativas.

## Longitudinalidade

A página do paciente abre uma janela de 24 consultas, até 250 avaliações e no máximo 25 eventos recentes por problema. Problemas logicamente excluídos continuam fora da lista por consulta segura; o histórico completo permanece acessível pela opção “Carregar histórico completo”, que executa a mesma página em modo completo. Nenhum registro é apagado ou tornado inacessível permanentemente.

## Índices

Nenhum índice novo foi criado. O ambiente desta rodada não ofereceu MariaDB com dados sintéticos para executar `EXPLAIN`; portanto, não há justificativa concreta para modificar o schema. A próxima rodada deve coletar planos para as consultas de histórico antes de qualquer migração.
