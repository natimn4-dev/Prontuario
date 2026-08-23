# Prontuário Aprimorado Clinical Design System

**Sigla:** PA-CDS

**Versão:** v1.0

**Direção:** Minimal Clinical Premium — Geriatric HealthTech

Este diretório é a referência visual oficial do Prontuário Aprimorado. Mudanças clínicas, metodológicas, de infraestrutura ou de dados não podem substituir silenciosamente este padrão de interface.

## Design target aprovado

A referência conceitual aprovada inclui:

- tela de Escalas Clínicas com cards por domínio, checkbox claro, estado `Aplicada`, resumo das escalas selecionadas e baixa densidade visual;
- relatório vertical A4 com marca profissional, resumo executivo, problemas clínicos/geriátricos, resultados, evolução longitudinal, orientações, vacinação/prevenção e assinatura;
- plano de medicamentos como **documento independente** do relatório final, com horários estruturados e saída própria de impressão/PDF;
- gráfico longitudinal aprovado de capacidade intrínseca e independência funcional, com seis linhas independentes por dimensão e marcador da consulta atual.

As referências visuais usam apenas dados sintéticos.

## Contratos de produto bloqueantes

1. **Relatório final e plano de medicamentos são documentos diferentes.** A tabela completa de medicamentos não pertence ao corpo do relatório final; o relatório apenas referencia a página própria do plano.
2. **Busca de paciente existente é fluxo clínico crítico.** Um erro 401/403/500 nunca pode ser apresentado como “Nenhum paciente encontrado”, e falha de busca não autoriza criar duplicata como substituição automática.
3. **O gráfico longitudinal aprovado é estrutural.** Não pode ser substituído por score global, radar, média artificial, linha única ou tabela que misture dimensões.
4. **Aprovação visual precede merge/deploy** quando houver mudança de relatório, impressão ou estrutura de UI aprovada.

## Arquivos

- `FOUNDATIONS.md` — princípios e linguagem visual.
- `TOKENS.md` — cores, tipografia, espaçamento, bordas e estados.
- `COMPONENTS.md` — componentes reutilizáveis.
- `CLINICAL-FORMS.md` — regras para formulários clínicos.
- `REPORTS-AND-PRINT.md` — relatório, plano de medicamentos e impressão.
- `ACCESSIBILITY.md` — acessibilidade mínima obrigatória.
- `GOVERNANCE.md` — regras para evitar regressões.
- `CHANGELOG.md` — histórico do PA-CDS.

## Implementação atual

Os tokens canônicos permanecem em `src/app/globals.css`. O relatório documental aprovado usa composição própria em `src/components/reports/aga-report-document-preview.tsx` e CSS module dedicado, evitando depender de sobreposição progressiva de CSS legado para definir a estrutura do documento. A página de medicamentos usa rota própria em `/consultations/[id]/medications/print`.

Os golden masters protegem os elementos estruturais mais importantes do design, mas não substituem QA visual humano em desktop, mobile e A4.