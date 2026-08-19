# Persistência explícita de status de medicamentos

## Escopo
Foi adicionada a estrutura persistente `MedicationStatusEvent` para registrar transições futuras de status de medicamentos de forma vinculada à consulta em que a decisão foi registrada.

Cada evento possui:
- `medicationId`;
- `patientId`;
- `consultationId`;
- `previousStatus` opcional;
- `newStatus` (`ACTIVE`, `SUSPENDED` ou `FINISHED`);
- `createdAt`.

## Integridade
O banco exige simultaneamente:
- `(medicationId, patientId)` existente em `Medication`;
- `(consultationId, patientId)` existente em `Consultation`.

Assim, um evento não pode vincular medicamento e consulta de pacientes diferentes.

## Migração conservadora
A migration cria uma tabela vazia, índices e chaves estrangeiras. Ela não contém `UPDATE`, cópia ou backfill baseado em `Medication.status`.

Consequência intencional: medicamentos já existentes continuam sem status histórico explícito até que informação revisada seja registrada prospectivamente.

## Fora deste incremento
- nenhum endpoint ou botão grava eventos ainda;
- `Medication.status` atual não é transformado em evento histórico;
- a tabela do cuidador e snapshots `MEDICATION_PLAN` ainda não consomem essa persistência.

A próxima etapa deve criar uma operação autenticada e transacional que derive paciente pela consulta, valide o medicamento, rejeite consulta finalizada e grave evento + estado atual sem aceitar `patientId` do navegador como fonte de verdade.
