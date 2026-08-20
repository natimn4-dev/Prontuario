# SOAP — guarda de procedência da reconciliação medicamentosa

Data: 2026-08-20

## Contexto

A evolução SOAP já incorpora automaticamente, no texto copiado para o prontuário, as medicações em uso obtidas do workspace temporal da consulta. O workspace distingue status derivados de histórico explicitamente reconciliado (`explicit-history`) de estados disponíveis apenas no cadastro atual (`current-record-only`) ou sem histórico suficiente (`unknown`).

Antes desta mudança, o cliente filtrava apenas `status === ACTIVE`. Em uma consulta mais recente, isso poderia apresentar como “medicação em uso” um estado ainda não confirmado por evento histórico explícito.

## Alteração

- a lista de medicações do SOAP passa a aceitar como “em uso” somente `ACTIVE + explicit-history`;
- a ação “Copiar para prontuário” falha fechado quando existe qualquer medicamento com procedência `current-record-only` ou `unknown`;
- falha ao carregar a reconciliação também bloqueia a cópia, em vez de produzir um SOAP com lista vazia;
- a interface informa quantos medicamentos ainda precisam de revisão explícita e orienta a voltar à reconciliação;
- nenhuma medicação é ativada, suspensa, finalizada ou reinterpretada automaticamente.

## Testes

Golden masters cobrem:

1. histórico totalmente explícito libera a cópia;
2. `current-record-only` bloqueia a cópia;
3. `unknown` bloqueia a cópia;
4. somente `ACTIVE + explicit-history` é elegível para “Medicações em uso”.

## Segurança clínica

A mudança harmoniza o SOAP com o contrato fail-closed já adotado pelo `MEDICATION_PLAN`: o estado atual do cadastro não é retroprojetado como evidência clínica de uma consulta sem revisão explícita. Não foram alterados doses, horários, vias, indicações, problemas, condutas ou regras terapêuticas.
