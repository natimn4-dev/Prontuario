# Changelog

## Trabalho em branch — 2026-08-24 — PR #105

- reorganizado o relatório final como documento A4 `Minimal Clinical Premium`, com cabeçalho profissional, resumo executivo em três cards, problemas clínicos/geriátricos separados, escalas agrupadas, gráfico longitudinal aprovado, plano de cuidados, orientações por capacidade intrínseca quando registradas, vacinação/prevenção e assinatura;
- removida da nova composição do relatório a tabela completa de medicamentos; o relatório referencia o documento próprio;
- criada rota read-only `/consultations/[id]/medications/print`, vinculada à consulta/paciente, preservando horários estruturados, reconciliação/status histórico e bloqueio de identidade/homônimo;
- adicionados golden masters do contrato de relatório/impressão e teste MySQL de isolamento paciente-consulta para o plano de medicamentos;
- mantida a correção endurecida da busca de pacientes existente no `main`, incluindo integração MySQL, fallback legado limitado e diferenciação de erros;
- documentado que busca de paciente existente é fluxo clínico crítico e que falha de pesquisa não autoriza duplicação;
- nenhuma regra de escala, conteúdo clínico, fingerprint, lógica de homônimos, autenticação/autorização ou metodologia do gráfico foi deliberadamente alterada;
- PR permanece em draft e não pode ser merged/deployed até CI completo + QA visual com dados sintéticos + aprovação explícita.

## PA-CDS v1.0 — 2026-08-23

- registrada identidade `Minimal Clinical Premium — Geriatric HealthTech`;
- restaurada paleta roxo/ameixa com fundo frio e superfícies brancas;
- adicionada marca profissional na entrada e sidebar clínica;
- sidebar passa a manter contexto resumido do paciente e sete etapas;
- entrada do paciente, problemas, medicamentos, SOAP, escalas e relatório alinhados ao mesmo sistema visual;
- adicionada camada de compatibilidade para impedir que CSS legado do relatório restaure a identidade marrom/serif;
- preservado explicitamente o gráfico longitudinal aprovado de capacidade intrínseca e independência funcional;
- adicionados golden masters anti-regressão visual;
- nenhuma regra clínica, classificação de escala ou persistência foi alterada por esta revisão visual.