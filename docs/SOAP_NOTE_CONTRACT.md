# Contrato versionado da nota SOAP

## Objetivo

Definir uma forma explícita, testável e conservadora de interpretar os campos JSON já existentes em `Consultation` que alimentam o renderer SOAP. Este contrato é uma fundação de domínio; nesta etapa ele **não altera o schema Prisma, não migra dados existentes e não cria endpoint ou interface de edição**.

## Versão atual

`1.0`

Cada seção persistida deve declarar `schemaVersion` e `kind`. O parser falha fechado quando encontra versão, tipo, campo ou estrutura desconhecida.

### `Consultation.subjective`

```json
{
  "schemaVersion": "1.0",
  "kind": "subjective",
  "text": "texto registrado pelo médico"
}
```

### `Consultation.objective`

```json
{
  "schemaVersion": "1.0",
  "kind": "objective",
  "physicalExam": "exame físico registrado",
  "vitalSigns": "sinais vitais registrados",
  "anthropometry": "antropometria registrada"
}
```

### `Consultation.plan`

```json
{
  "schemaVersion": "1.0",
  "kind": "plan",
  "byProblem": {
    "problemId": ["conduta registrada para este problema"]
  }
}
```

Todos os campos clínicos de texto são opcionais. Ausência permanece ausência e será apresentada pelo renderer atual como `sem dados registrados` quando aplicável.

## O que não é duplicado neste contrato

- **Avaliação:** a seção A do SOAP continua sendo derivada da lista longitudinal de `ClinicalProblem` válida no horizonte da consulta. O campo genérico `Consultation.assessment` não é interpretado por este contrato v1.
- **Medicações:** continuam vindo da fonte estruturada de medicamentos/regimes e horários; não são copiadas para os JSON da nota.
- **Escalas:** permanecem em `ScaleAssessment` e não são embutidas no JSON SOAP.
- **Sugestões automáticas:** não são promovidas a conduta confirmada por este contrato.

Essa separação reduz duplicação de estado clínico e risco de divergência entre documentos e dados longitudinais.

## Política para JSON existente ou legado

Qualquer JSON que não corresponda explicitamente ao contrato suportado deve ser tratado como **não interpretável automaticamente**. Não fazer coerção silenciosa, completar campos, assumir versões nem converter conteúdo ambíguo sem uma migração deliberada e testada.

Antes de ligar este contrato à persistência real, deve-se:

1. inventariar formatos eventualmente já gravados nos campos JSON;
2. definir estratégia de migração/revisão para registros incompatíveis;
3. criar endpoint autenticado que derive `patientId` da consulta e recuse alteração de consulta finalizada;
4. adicionar testes de integração de isolamento entre pacientes e de concorrência quando aplicável;
5. somente então expor a prévia SOAP e um único botão `Copiar para prontuário`.

## Implementação

- domínio: `src/domain/consultation-note-contract.ts`
- testes: `tests/golden-master/consultation-note-contract.test.ts`
- renderer existente: `src/domain/document-renderers.ts`
