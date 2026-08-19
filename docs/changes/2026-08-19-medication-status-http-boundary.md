# Fronteira HTTP para status de medicamentos

## Endpoint
`POST /api/consultations/[id]/medications/status`

## Corpo permitido
A requisição aceita exclusivamente:
- `medicationId`;
- `newStatus`: `ACTIVE`, `SUSPENDED` ou `FINISHED`.

A `consultationId` é obtida exclusivamente da rota. `patientId`, status anterior, status atual, flags de histórico e qualquer outro campo são rejeitados antes da chamada ao serviço.

## Respostas seguras
- payload inválido: 400;
- autenticação ausente: 401;
- usuário sem permissão: 403;
- consulta/medicamento não encontrado no contexto permitido: 404;
- conflito de workflow, consulta antiga/finalizada ou divergência de histórico: 409;
- falha interna: 500 com mensagem genérica, sem detalhes de banco/Prisma.

## Fora deste incremento
- nenhum botão ou seletor de status é adicionado à interface;
- nenhuma mudança automática de status é realizada;
- snapshots de medicamentos ainda não consomem o histórico.

A UI só deve ser conectada depois de disponibilizar ao componente o estado atual derivado do servidor e apresentar claramente que a ação registra uma mudança clínica prospectiva.
