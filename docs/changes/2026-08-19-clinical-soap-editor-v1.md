# Editor SOAP clínico v1

## Objetivo

Disponibilizar a evolução SOAP diretamente na página da consulta sem reinterpretar JSON legado nem duplicar fontes longitudinais.

## Contrato

- `subjective`, `objective` e `plan` permanecem no schema versionado `1.0`.
- `assessment` livre não é gravado: a seção A é derivada dos problemas confirmados no horizonte da consulta.
- medicações permanecem fonte longitudinal própria; o JSON SOAP não duplica a lista de medicamentos.
- consulta finalizada é somente leitura.
- conteúdo legado/incompatível falha fechado e exige revisão antes de edição estruturada.

## Concorrência e identidade

- `patientId` nunca é aceito do navegador;
- a consulta da rota determina o paciente;
- o PUT exige `expectedUpdatedAt` e usa compare-and-set;
- plano por problema só aceita IDs presentes na projeção longitudinal daquela consulta;
- a atualização e a auditoria ocorrem em transação `Serializable`.

## UX

A consulta passa a começar pelo SOAP:

1. S — motivo/HDA e informações subjetivas;
2. O — exame físico, sinais vitais e antropometria;
3. A — problemas clínicos/geriátricos confirmados;
4. P — ações vinculadas a cada problema.

Existe um único comando `Copiar para prontuário`, habilitado somente quando não há alterações locais pendentes.

## Limite conhecido desta etapa

A prévia textual ainda aponta para a seção de reconciliação medicamentosa; a próxima etapa conecta o read model temporal de medicamentos diretamente ao SOAP e à tabela clínica, sem inferir status histórico ausente.
