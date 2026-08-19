# Escalas centrais da AGA — Freitas/Py

## Objetivo
Substituir a situação em que a consulta expunha essencialmente ECOG/CRASH por um primeiro núcleo de escalas geriátricas da fonte clínica principal, sem promover versões divergentes do legado.

## Liberadas para nova aplicação
- Katz/ABVD: 6 funções, 0–6; cada função permanece armazenada individualmente; nenhuma categoria intermediária de gravidade é inventada.
- Lawton/AIVD: 7 itens, 1–3 por item, total 7–21; maior pontuação indica maior independência.
- GDS-15: 15 itens com chave Freitas/Py; 0–5 rastreio não positivo, 6–10 sugestivo, 11–15 fortemente positivo; nunca equivale automaticamente a diagnóstico de depressão.

Cada instrumento recebe uma versão `freitas-py-...` própria. Assessments históricos legados não são alterados nem convertidos.

## Segurança
O navegador envia somente `scaleCode` e respostas. Score, classificação e interpretação são calculados no domínio/servidor e persistidos com patientId derivado da consulta. Consulta finalizada permanece imutável.

## Instrumentos ainda não automatizados
Avaliação funcional breve, MNA completa, Pfeffer 10 itens, SPPB, POMA, Mini-Cog, MEEM, desenho do relógio, MoCA experimental brasileira, IQCODE-Br, CES-D, MOS-SSS, APGAR familiar e Zarit 22 permanecem explicitamente como revisão/migração necessária. A UI os mostra como backlog clínico, não como opções aplicáveis.

Em particular: MNA completa não é MNA-SF; Pfeffer Freitas não é o formulário legado de 11 itens; versões incompatíveis não podem ser comparadas silenciosamente.
