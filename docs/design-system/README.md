# Prontuário Aprimorado Clinical Design System

**Sigla:** PA-CDS

**Versão:** v1.0

**Direção:** Minimal Clinical Premium — Geriatric HealthTech

Este diretório é a referência visual oficial do Prontuário Aprimorado. Mudanças clínicas, metodológicas, de infraestrutura ou de dados não podem substituir silenciosamente este padrão de interface.

## Design target aprovado

A referência conceitual aprovada inclui:

- tela de Escalas Clínicas com cards por domínio, checkbox claro, estado `Aplicada`, resumo das escalas selecionadas e baixa densidade visual;
- relatório vertical A4 com marca profissional, problemas clínicos/geriátricos, resultados, evolução longitudinal, orientações, medicamentos e assinatura;
- tabela de medicamentos estruturada por horários, com checkbox e saída de impressão/PDF;
- gráfico longitudinal aprovado de capacidade intrínseca e independência funcional, com seis linhas independentes por dimensão e marcador da consulta atual.

As referências visuais usam apenas dados sintéticos.

## Arquivos

- `FOUNDATIONS.md` — princípios e linguagem visual.
- `TOKENS.md` — cores, tipografia, espaçamento, bordas e estados.
- `COMPONENTS.md` — componentes reutilizáveis.
- `CLINICAL-FORMS.md` — regras para formulários clínicos.
- `REPORTS-AND-PRINT.md` — relatório, tabela de medicamentos e impressão.
- `ACCESSIBILITY.md` — acessibilidade mínima obrigatória.
- `GOVERNANCE.md` — regras para evitar regressões.
- `CHANGELOG.md` — histórico do PA-CDS.

## Implementação atual

Os tokens canônicos estão em `src/app/globals.css`; a camada de compatibilidade visual do relatório está em `src/app/clinical-premium-overrides.css`. A migração para uma pasta `src/styles/` poderá ocorrer incrementalmente, sem refatoração massiva insegura.

O golden master `tests/golden-master/clinical-design-system.test.ts` protege os elementos estruturais mais importantes do design.