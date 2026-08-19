# Governança de procedência das escalas Freitas/Py

Data: 2026-08-19

## Contexto

As versões Freitas/Py já expostas no fluxo clínico usam códigos próprios para evitar reclassificação silenciosa de avaliações históricas. A política central de procedência ainda mantinha alguns códigos de inventário/legado como únicos representantes do instrumento, fazendo versões novas como `pfeffer10`, `sppb_freitas`, `poma_freitas` e as escalas cognitivas Freitas caírem no fallback `not-covered` / `secondary-source`.

## Alteração

- a versão da política de fonte foi atualizada para `2026-08-19`;
- os códigos ativos Freitas/Py passaram a declarar cobertura explícita do apêndice e estado `adopted`;
- códigos históricos incompatíveis (`pfeffer`, `moca`, `sppb`, `minicog`, `poma`, `iqcode_br`) continuam marcados como `migration-required` quando não representam a mesma versão ativa;
- MEEM Freitas e relógio Shulman preservam `defines-form-only` quando a interpretação depende de fonte suplementar identificada;
- escala desconhecida continua falhando fechado para governança de fonte, como `not-covered` / `secondary-source`.

## Segurança clínica

Nenhuma fórmula, ponto de corte, classificação, interpretação, intervenção ou dado persistido foi alterado. A mudança é exclusivamente de procedência/versionamento e impede que uma versão clinicamente exposta seja rotulada incorretamente como não coberta pela fonte principal.

## Testes

O golden master `scale-source-policy.test.ts` cobre:

- todos os códigos Freitas/Py atualmente expostos como `adopted`;
- preservação de `migration-required` nos códigos históricos divergentes;
- manutenção do fallback fail-closed para escalas desconhecidas.
