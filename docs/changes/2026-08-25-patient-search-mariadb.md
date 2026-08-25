# Busca de pacientes — resiliência no MariaDB de produção

Release: `2026-08-25-patient-search-mariadb-v5`

## Sintoma confirmado

A busca autenticada na página inicial retornava `PATIENT_SEARCH_FAILED` (HTTP
500) para um nome existente. O cache e a autenticação já estavam saudáveis.

## Correção restrita

- separa a localização dos dados mínimos do paciente da leitura da consulta
  ativa, evitando joins em todas as estratégias de busca;
- mantém o índice normalizado como caminho rápido, mas não transforma uma
  divergência transitória do índice/schema em falha total;
- mantém a busca pelo nome-fonte e o scan canônico limitado para dados legados;
- se apenas a relação de consulta ativa falhar, ainda devolve o paciente com
  destino seguro para o resumo longitudinal;
- não registra consultas, nomes ou outros dados pessoais nos logs.

## Gates

- testes unitários e de integração MySQL;
- typecheck;
- build de produção;
- smoke clínico e teste autenticado da busca após a implantação.
