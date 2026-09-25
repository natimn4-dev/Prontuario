# Observação sensorial funcional — 2026-09-25

## Escopo

- A aba Escalas permite registrar, por consulta, se houve avaliação sensorial, a presença de alteração simultânea de visão e audição e o uso de lentes corretoras.
- A observação aparece na Visão geral do relatório AGA somente quando registrada na consulta do relatório.
- A exportação acessível inclui o mesmo resumo.

## Salvaguardas

- “Não avaliada” permanece distinta de “avaliada sem achados”.
- Registro ligado ao mesmo `patientId` e `consultationId`, com revisões anteriores preservadas, controle de concorrência e evento de auditoria.
- A observação não é tratada como escala validada e não modifica escores, classificações ou trajetórias separadas de audição e visão.
- O formato do snapshot AGA avança para `1.4`.
