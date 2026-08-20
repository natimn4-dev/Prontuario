# Integração do plano de medicamentos ao DocumentSnapshot

## Objetivo
Conectar o contrato fail-closed do plano de medicamentos ao mecanismo real de `DocumentSnapshot`, sem inferir estados históricos ou condutas terapêuticas.

## Alterações
- novo serviço `generateMedicationPlan` carrega o workspace medicamentoso derivado do servidor para a consulta alvo;
- o nome do paciente é obtido da relação persistida consulta → paciente;
- `buildMedicationPlanSnapshotModel` continua bloqueando geração quando existe `UNKNOWN`, `current-record-only` ou divergência de consulta;
- o conteúdo aprovado é persistido como `DocumentSnapshot` do tipo `MEDICATION_PLAN`, com `contentSchemaVersion` vindo do próprio contrato;
- novo endpoint `POST /api/consultations/:id/reports/medications` devolve plano, texto, rastreabilidade dos excluídos e `id/version` do snapshot.

## Segurança
- nenhuma medicação, dose, via, frequência, horário, status ou decisão terapêutica é inferida;
- apenas medicamentos `ACTIVE` com histórico explícito entram no plano destinado ao cuidador;
- `SUSPENDED` e `FINISHED` permanecem fora do texto entregue e continuam rastreáveis no snapshot;
- o `patientId` do snapshot continua sendo derivado no servidor a partir da consulta, nunca do cliente;
- o endpoint não amplia rotas públicas nem remove autenticação/autorização existentes.

## Limite conhecido
A leitura do workspace e a criação do snapshot seguem o mesmo padrão já usado pelo relatório AGA: são operações server-side sequenciais, cada uma com suas próprias salvaguardas. Uma futura melhoria poderá unificá-las em uma transação única se houver necessidade de consistência serializável ponta a ponta durante geração concorrente.
