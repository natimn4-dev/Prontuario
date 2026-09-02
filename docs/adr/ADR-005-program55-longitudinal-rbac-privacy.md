# ADR-005 — Programa 55+: modelo longitudinal, RBAC aditivo e privacidade

Status: aceito para implementação
Data: 2026-09-02

## Contexto

O Prontuário Aprimorado já possui identidade canônica em `Patient.id`, consultas geriátricas consolidadas, motor de escalas, autenticação Google e papéis globais `ADMIN`, `PHYSICIAN` e `READ_ONLY`. O Programa 55+ deve acrescentar acompanhamento multiprofissional sem reescrever essas estruturas.

## Decisão 1 — linha de cuidado aditiva

O Programa 55+ usa `Patient.id` existente e cria entidades próprias apenas para o ciclo do programa:

- `Program55Enrollment`;
- `Program55Checkpoint`;
- `Program55BodyComposition`;
- `Program55ProfessionalAssessment`;
- `Program55Goal`;
- `Program55ProfessionalMembership`;
- `Program55RestrictedPsychologyNote`.

Nenhuma história clínica, medicamento, problema ou escala é duplicada.

## Decisão 2 — consulta clínica permanece independente

`ConsultationType` não será alterado. Um checkpoint pode apontar opcionalmente para uma consulta coordenadora existente por `coordinatingConsultationId`, com integridade composta por `patientId`.

Isso permite que a avaliação 55+ agregue a consulta sem transformar cada checkpoint em uma nova semântica de consulta.

## Decisão 3 — escalas continuam no motor existente

`ScaleDefinition` e `ScaleAssessment` permanecem como fonte única. O Programa 55+ apenas consulta resultados, versões, datas e classificações já persistidas.

Nenhuma escala é automaticamente escolhida pelo sistema.

## Decisão 4 — RBAC multiprofissional sem alterar o login estabilizado

Os papéis globais atuais não serão modificados nesta entrega. A autorização multiprofissional é uma camada aditiva:

`Program55ProfessionalMembership(enrollmentId, userId, discipline, active)`.

Disciplinas:

- PHYSICIAN;
- PHYSIOTHERAPY;
- NUTRITION;
- PSYCHOLOGY.

Regras:

- ADMIN/PHYSICIAN podem coordenar enrollment e participantes;
- ADMIN/PHYSICIAN podem escrever apenas o domínio médico por seu papel global;
- fisioterapia, nutrição e psicologia exigem participação ativa na disciplina correspondente;
- um usuário `READ_ONLY` global pode receber escrita exclusivamente no domínio 55+ ao ser explicitamente vinculado como profissional, sem ganhar direitos de escrita no prontuário geriátrico;
- vincular profissional não cria conta, não muda allowlist e não altera autenticação Google.

## Decisão 5 — privacidade da psicologia

A avaliação de psicologia tem dois níveis:

1. `sharedSummary` + dados estruturados pertinentes ao cuidado integrado;
2. `Program55RestrictedPsychologyNote` para conteúdo profissional restrito.

A nota restrita:

- não aparece no MAPA 55+;
- não aparece no resumo integrado;
- só é lida pelo autor ou por profissional com participação ativa em PSYCHOLOGY;
- só pode ser editada pelo próprio autor;
- gera AuditEvent sem conteúdo clínico nos metadados.

## Decisão 6 — autoria e auditoria

Toda gravação 55+ mantém FK explícita do autor quando aplicável e gera `AuditEvent` com:

- userId;
- entidade;
- entityId;
- ação;
- outcome;
- disciplina no `reasonCode` quando pertinente.

Conteúdo clínico não é copiado para o log de auditoria.

## Decisão 7 — GLIM e Tera Science

Não haverá cálculo automático de GLIM nesta entrega. Pode existir conclusão GLIM registrada manualmente pelo nutricionista, sem que o sistema aplique critérios/pontos de corte ainda não validados para a implementação eletrônica.

Tera Science b.IA pode ser registrada como origem documental de uma medição manual. Não haverá scraping, API presumida ou armazenamento de credencial do equipamento.

## Rollback

A migration é apenas aditiva. Em rollback emergencial:

1. reimplantar o commit estável anterior;
2. não remover as novas tabelas;
3. preservar dados do Programa 55+;
4. a versão anterior continuará funcionando porque não referencia as novas entidades.
