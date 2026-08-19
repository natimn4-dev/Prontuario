# Reconciliação medicamentosa clínica

## Objetivo

Disponibilizar medicamentos reais no fluxo da consulta sem apagar história e sem usar o estado atual para reconstruir indevidamente consultas antigas.

## Projeção temporal

- o horizonte da consulta é derivado no servidor;
- para cada medicamento, o regime efetivo é o último regime dentro desse horizonte;
- duas gravações na mesma consulta preservam ambas no banco e a mais recente vira a projeção atual;
- evento de status explícito prevalece;
- em consulta histórica sem evento explícito, status permanece `UNKNOWN`;
- somente na consulta mais recente o `Medication.status` atual pode ser exibido como `current-record-only`, explicitamente sem pretensão de reconstruir o passado.

## Escrita

- novo medicamento cria `Medication`, primeiro `MedicationRegimen` e evento explícito `null → ACTIVE` na mesma transação;
- mudança de dose/horário cria novo `MedicationRegimen`; não sobrescreve o anterior;
- horários usam `MedicationScheduleSlot`, não texto de frequência;
- status usa a fronteira específica já existente, com histórico e compare-and-set;
- edição só ocorre na consulta mais recente não finalizada;
- paciente sempre é derivado da consulta.

## Interface

- tabela “em uso” é destinada a leitura prática por família/cuidador;
- suspensos, finalizados e status historicamente desconhecidos ficam fora dessa tabela, mas permanecem visíveis na revisão clínica;
- status sem histórico explícito recebe aviso próprio;
- SOAP passa a listar em Objetivo somente os medicamentos projetados como `ACTIVE` naquela consulta.
