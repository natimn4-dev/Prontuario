# ADR-006 — Oncogeriatria: episódio, curso, checkpoint e decisão clínica humana

Status: aceito; decisão do CARG atualizada em 06/09/2026
Data: 2026-09-02

## Contexto

O Prontuário Aprimorado já possui identidade canônica em `Patient.id`, consultas geriátricas, motor de escalas, medicamentos, problemas, documentos, auditoria e Programa 55+ longitudinal. A Oncogeriatria precisa acrescentar uma trajetória própria sem transformar câncer ou tratamento em um segundo prontuário.

## Decisão 1 — episódio oncológico, não cadastro paralelo

`OncogeriatricEpisode` é N:1 com paciente. Isso permite neoplasias distintas ao longo do tempo e preserva a identidade canônica.

## Decisão 2 — curso terapêutico separado de Medication

`OncogeriatricTreatmentCourse` registra modalidade, intenção, linha, esquema e ciclos. Antineoplásicos não são convertidos automaticamente em medicamentos crônicos.

## Decisão 3 — Consultation permanece independente

`ConsultationType` não é alterado. Checkpoints podem apontar opcionalmente para consulta existente. Escalas que exigem `consultationId` só são persistidas quando esse vínculo explícito existe; o sistema não cria consulta artificial.

## Decisão 4 — motor único de escalas

G8 permanece em `ScaleDefinition`/`ScaleAssessment`. O checkpoint guarda apenas o ID do assessment correspondente. Nenhuma segunda tabela de pontuações é criada.

O CARG reutiliza `ScaleDefinition`/`ScaleAssessment` e o vínculo `cargAssessmentId` do checkpoint. A definição `CARG / HURRIA_2011` é ativada por migration aditiva após liberação clínica documentada pelo Responsável pelo Produto.

## Decisão 5 — cálculo clínico fora do React

A regra G8 e a regra CARG ficam em `src/domain/oncogeriatria/calculators.ts`, cobertas por golden masters. Componentes React coletam respostas e solicitam a prévia ao domínio, mas o servidor sempre recalcula o resultado antes de persistir.

## Decisão 6 — CARG liberado com rastreabilidade e decisão humana

O documento técnico de transferência v1.0, de 06/09/2026, registra a liberação clínica do CARG para o escopo do projeto. O sistema:

- implementa os 11 fatores do modelo de Hurria et al. (2011) no domínio versionado;
- mostra a composição do escore para conferência;
- recalcula no servidor e persiste no motor único de escalas;
- diferencia máximo teórico de 23 da faixa 0–19 observada no estudo original;
- apresenta 30%, 52% e 83% como frequências observadas nas faixas de derivação, não como risco individual determinístico;
- sinaliza uso fora da população original sem impedir decisão clínica humana;
- não envia dados a calculadoras externas;
- não prescreve alteração de dose, esquema, intervalo ou suspensão.

## Decisão 7 — comparabilidade longitudinal versionada

Δ geriátrico e gráficos não misturam versões diferentes do mesmo instrumento. Mudança numérica não recebe automaticamente rótulo de melhora/piora sem regra clínica validada.

## Decisão 8 — privacidade e auditoria

Todas as gravações têm autoria e AuditEvent. Logs técnicos não armazenam conteúdo clínico sensível. Rotas validam paciente + episódio + curso/checkpoint para reduzir IDOR horizontal.

## Decisão 9 — snapshot próprio sem alterar DocumentType

Na v1, `OncogeriatricReportSnapshot` é entidade aditiva porque `DocumentSnapshot` exige `consultationId` e um `DocumentType` compartilhado. Alterar essas estruturas existentes apenas para encaixar o novo relatório aumentaria risco de regressão. A assinatura digital existente permanece intocada.

## Decisão 10 — relatório específico da Oncogeriatria

O relatório final consolida contexto oncológico, G8, trajetória geriátrica baseline→atual, vulnerabilidades, recomendações geriátricas previamente registradas, mudanças desde o último checkpoint, eventos durante tratamento, recuperação/pós-tratamento e objetivo prioritário do paciente. Copiar, imprimir ou gerar snapshot exige confirmação explícita de revisão clínica.

## Decisão 11 — feature safety

`ONCOGERIATRIA_EMERGENCY_DISABLED=true` desativa apenas a área nova. O rollback preferencial é de código, preservando tabelas/dados novos.
