# Family report — Vacinas e prevenção

## Objetivo

Adicionar ao relatório destinado a paciente, família e cuidadores uma seção própria para o estado da revisão vacinal, sem transformar o prontuário em prescritor automático de vacinas.

## Implementação

- a consulta passa a registrar `UNKNOWN`, `UP_TO_DATE` ou `PENDING` no JSON objetivo versionado;
- quando há pendências, o médico informa somente os nomes das vacinas, uma por linha;
- o relatório AGA e o renderer familiar exibem **Vacinas e prevenção** fora da tabela de medicamentos;
- status desconhecido gera orientação para levar e revisar a carteira, sem presumir pendências;
- textos com comandos de aplicar, administrar, receber ou prescrever vacina são excluídos das sugestões automáticas destinadas à família;
- o snapshot do relatório AGA passa ao schema `1.2` para registrar a nova seção.

## Segurança clínica

O relatório não seleciona vacinas, produtos, doses, esquemas ou datas. As pendências são somente dados explicitamente revisados e registrados pelo profissional. A seção informa que não constitui prescrição automática e que os próximos passos dependem de revisão clínica individual.

## Testes

- estado desconhecido e orientação para revisão da carteira;
- pendências explícitas, normalização e deduplicação;
- rejeição de rótulos prescritivos, status inconsistentes e campos não permitidos;
- persistência no contrato SOAP e validação da fronteira HTTP;
- separação visual e textual da tabela de medicamentos;
- regressão do filtro de segurança farmacológica/vacinal do relatório familiar.
