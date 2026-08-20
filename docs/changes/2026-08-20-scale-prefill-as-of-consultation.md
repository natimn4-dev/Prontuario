# Pré-preenchimento de escalas respeita o horizonte da consulta

## Contexto

Após proteger as escalas complementares contra resultados de consultas futuras, a mesma revisão identificou duas superfícies com o mesmo risco temporal: a leitura das escalas Freitas e o pré-preenchimento oncogeriátrico (MEEM, MNA-SF e ECOG). Em consulta histórica, ambas podiam selecionar o resultado mais recente do paciente sem limitar a busca ao momento da consulta aberta.

## Alteração

- Freitas-core agora limita a busca de avaliações às consultas pertencentes ao horizonte da consulta selecionada.
- Oncogeriatria usa o mesmo horizonte tanto no GET de pré-preenchimento quanto na rastreabilidade `autoFilledFrom` do CRASH-MNA-SF.
- A ordenação longitudinal continua determinística por `occurredAt`, `createdAt` e `id`.
- Linha temporal com paciente divergente ou consulta alvo ausente é rejeitada pelo domínio.

## Segurança clínica

Nenhum cálculo, ponto de corte, classificação, interpretação ou resposta de escala foi alterado. A mudança somente impede que informação registrada depois da consulta selecionada seja exibida ou persistida como fonte de pré-preenchimento retrospectivo.
