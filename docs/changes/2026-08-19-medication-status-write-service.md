# Serviço prospectivo de mudança de status de medicamentos

## Objetivo
Disponibilizar uma operação interna de servidor para registrar mudanças futuras de status sem reconstruir ou reescrever o passado.

## Regras de segurança
- autenticação exige `consultation.write`;
- `patientId` é derivado da consulta no servidor e não faz parte do input público do serviço;
- consulta finalizada é imutável;
- o medicamento precisa pertencer ao mesmo paciente da consulta;
- a alteração só é aceita na consulta cronologicamente mais recente do paciente;
- quando já existe histórico explícito, `Medication.status` atual precisa coincidir com o último evento registrado;
- a atualização do estado atual usa compare-and-set (`expectedCurrentStatus`) para detectar mudança concorrente;
- evento, estado atual e auditoria são gravados na mesma transação `Serializable`;
- no primeiro evento explícito, `previousStatus` permanece `null`: o estado legado anterior não é inferido.

## Fora deste incremento
- não há endpoint HTTP;
- não há controle de UI;
- snapshots `MEDICATION_PLAN` ainda não usam o novo histórico;
- não existe backfill de registros antigos.

A próxima etapa deve expor a operação por uma fronteira HTTP estrita que aceite apenas `medicationId` e `newStatus`, mantendo paciente e contexto clínico como dados exclusivos do servidor.
