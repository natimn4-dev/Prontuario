# Histórico explícito de status de medicamentos

## Problema
`Medication.status` representa o estado atual e não pode ser usado para reconstruir, com segurança, o estado de um medicamento em uma consulta passada.

## Contrato de domínio
A projeção `medicationStatusAsOf` aceita somente eventos explícitos associados a paciente, medicamento e consulta. O horizonte da consulta define quais eventos podem participar da reconstrução.

- sem evento explícito até o horizonte: status histórico desconhecido;
- evento futuro: não retroage;
- mistura de paciente ou medicamento: falha fechada;
- cadeia de transições inconsistente: falha fechada;
- nenhuma inferência é feita a partir do `Medication.status` atual.

## Próximo passo seguro
Adicionar persistência própria para eventos de status, vinculada por chaves compostas a paciente/medicamento/consulta. Dados existentes não devem receber backfill inferido; permanecem com status histórico desconhecido até haver informação explícita revisada.
