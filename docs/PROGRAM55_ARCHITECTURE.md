# Programa 55+ — arquitetura e operação

## Escopo

Linha de cuidado adicional do Prontuário Aprimorado para pacientes de 55 a 70 anos, usando o mesmo `Patient.id`.

## Rotas

- `/programa-55` — lista de pacientes elegíveis;
- `/patients/[id]/programa-55` — resumo e ciclo;
- `/patients/[id]/programa-55/composicao` — composição corporal;
- `/patients/[id]/programa-55/equipe` — avaliação multiprofissional;
- `/patients/[id]/programa-55/metas` — prioridades/metas;
- `/patients/[id]/programa-55/longitudinal` — comparação temporal;
- `/patients/[id]/programa-55/mapa` — MAPA 55+ imprimível;
- `POST /api/program55/patients/[id]` — gravações server-side por ação validada.

## Ciclo longitudinal

Ao iniciar o programa é criado um único enrollment por paciente e quatro checkpoints planejados:

- BASELINE — data de entrada;
- DAY_90 — +90 dias;
- DAY_180 — +180 dias;
- YEAR_1 — +365 dias.

O vínculo com uma consulta clínica é opcional. `ConsultationType` não é alterado.

## Banco

Migration: `20260902192000_program55_longitudinal_core`.

Novas tabelas são exclusivamente aditivas. A migration não altera tabelas clínicas preexistentes.

## Composição corporal

Registro manual estruturado:

- peso;
- altura;
- IMC;
- circunferência abdominal;
- gordura corporal (%);
- massa de gordura;
- massa livre de gordura;
- massa muscular, quando informada pelo exame;
- métricas adicionais documentadas;
- origem/equipamento;
- data e observações.

O sistema não inventa índices, faixas de normalidade ou semáforos para valores contínuos.

## Nutrição, fisioterapia e psicologia

`Program55ProfessionalAssessment` armazena dados estruturados e resumo compartilhável por checkpoint/disciplina.

Nutrição possui campo para conclusão GLIM registrada pelo profissional, mas não executa cálculo ou diagnóstico automático nesta versão.

Psicologia separa `sharedSummary` de `Program55RestrictedPsychologyNote`.

## Escalas

O módulo lê `ScaleDefinition` e `ScaleAssessment`; não possui tabela paralela. Na visão longitudinal, séries são agrupadas por código **e versão**, impedindo comparação silenciosa de versões diferentes.

## Metas

`Program55Goal` persiste objetivo, domínio, indicador, baseline, meta, prazo, responsável e situação. Não há geração automática de metas.

## RBAC

O mecanismo global ADMIN/PHYSICIAN/READ_ONLY não é modificado.

`Program55ProfessionalMembership` adiciona autorização limitada à linha de cuidado e à disciplina. Essa participação não concede escrita nas rotas clínicas antigas.

## Auditoria

Gravações criam `AuditEvent` sem duplicar conteúdo clínico sensível no log.

## Feature / disponibilidade

Por decisão posterior da product owner, o Programa 55+ está ativo por padrão para 55–70 anos. `PROGRAM55_EMERGENCY_DISABLED=true` funciona como kill switch emergencial.

## Readiness

`GET /api/health` só declara produção saudável quando:

- banco responde;
- release ID corresponde ao código em validação;
- Programa 55+ está ativo na faixa 55–70;
- a tabela `Program55Enrollment` existe (`schemaReady=true`).

## Segurança

- todas as gravações são autenticadas no servidor;
- patientId e checkpoint são validados em conjunto para reduzir IDOR horizontal;
- profissionais só editam disciplina autorizada;
- vincular um profissional exige um `User` ativo já autorizado;
- nenhum endpoint cria conta ou altera allowlist;
- notas restritas de psicologia não entram em MAPA/resumos integrados.

## Rollback

Commit estável anterior ao núcleo longitudinal: `cec8af5cf0696819193b40359ee221ebb3445d09`.

Como a migration é aditiva, o código anterior pode ser reimplantado sem remover as novas tabelas. Nunca executar DROP no rollback emergencial.
