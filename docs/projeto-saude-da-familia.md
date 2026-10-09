# Projeto Saúde da Família

Especificação funcional e técnica autorizada pela product owner, Dra. Natalia Mendes, para o módulo de cuidado da pessoa idosa na medicina de família.

[Baixar o relatório completo em Word](./projeto-saude-da-familia.docx)

Versão 1.2 — 8 de outubro de 2026 — 14 páginas.

O relatório reúne fluxos, regras clínicas, requisitos de interface e persistência, modelo de dados sugerido, etapas de entrega e critérios de aceite.

## Escopo aprovado

- Cognição: 10-CS; aprofundamento com MEEM quando indicado; FAST em demência já diagnosticada.
- Funcionalidade: Katz e Lawton.
- Humor: GDS-5.
- Locomoção: cinco levantadas, apoio à deambulação e SARC-CalF.
- Fragilidade: FRAIL-BR; nutrição: MNA-SF.
- Quedas e revisão medicamentosa: STOPPFall.
- Disfagia quando houver queixa; PPS quando houver indicação de cuidados paliativos.
- Visão, audição, cinco ou mais doenças crônicas e uso diário de cinco ou mais medicamentos.
- Internação nos últimos seis meses: abrir LACE com episódio e data da alta identificados.

## Orientação para engenharia

Preservar respostas e resultados por paciente e consulta; abrir reaplicações em branco; manter os subestágios FAST como texto, por exemplo 7E; gerar comparações apenas entre aplicações realizadas e compatíveis. Validar versões e contratos clínicos antes de codificar classificações.

Esta entrega é documentação de planejamento. Não implementa mudanças no aplicativo, não altera regras clínicas existentes e não constitui implantação em produção.
