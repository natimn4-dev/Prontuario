# Contrato seguro para snapshot do plano de medicamentos

## Contexto
A tabela destinada ao cuidador já exibe apenas medicamentos projetados como `ACTIVE`, enquanto suspensos/finalizados permanecem disponíveis na reconciliação para rastreabilidade. O próximo passo para persistir `MEDICATION_PLAN` exige evitar reconstrução retrospectiva a partir do estado atual do cadastro.

## Alteração
Foi criado um contrato de domínio para o conteúdo do snapshot do plano de medicamentos.

- o `consultationId` do workspace deve coincidir com a consulta alvo;
- todos os medicamentos precisam possuir status proveniente de `explicit-history`;
- `UNKNOWN` e `current-record-only` bloqueiam a geração em modo fail-closed;
- somente `ACTIVE` entra no plano entregue ao cuidador;
- `SUSPENDED` e `FINISHED` não aparecem no texto do plano, mas seus IDs/status permanecem no modelo de snapshot para rastreabilidade técnica;
- nome, dose/apresentação, via, horários e observações continuam usando o mesmo `MedicationPlanViewModel` validado já adotado pela UI.

## Não alterado
Nenhuma medicação, dose, frequência, via, horário, indicação ou regra terapêutica foi criada ou inferida. Ainda não foi conectado um endpoint de geração/persistência: esta etapa estabelece primeiro o contrato puro e seus golden masters para que a integração com `DocumentSnapshot` possa ser feita sem ambiguidade histórica.
