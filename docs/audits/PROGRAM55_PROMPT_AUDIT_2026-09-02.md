# Auditoria do Prompt Mestre — Programa 55+

Data: 2026-09-02
Base auditada: `main` em `cec8af5cf0696819193b40359ee221ebb3445d09`
Produção: `https://prontuario.nataliamendesgeriatra.com`

## Resultado executivo

A implantação existente antes desta entrega comprovava a disponibilidade da rota e do dashboard 55–70 anos, mas ainda não satisfazia os critérios finais do prompt mestre. O núcleo estava somente leitura e não possuía persistência própria para enrollment, checkpoints, composição corporal, avaliações multiprofissionais, metas ou MAPA 55+.

## Matriz de conformidade antes desta entrega

| Fase do prompt | Estado encontrado | Evidência / lacuna |
| --- | --- | --- |
| 0 — Auditoria | Parcialmente concluída | Baseline, CI e smoke já existiam; faltava matriz formal contra o prompt mestre. |
| 1 — Fundação | Parcial | Feature disponível; faltavam schema aditivo, domínio persistente e APIs/serviços do programa. |
| 2 — Dashboard | Parcial | `/programa-55` e `/patients/[id]/programa-55` existiam; faltavam enrollment/checkpoints reais. |
| 3 — Bioimpedância | Não concluída | Tela informava que composição corporal estruturada ainda não era registrada. |
| 4 — Nutrição | Não concluída | Apenas consumo de resultados de escalas existentes. |
| 5 — Função física | Não concluída | Apenas consumo de resultados de escalas existentes. |
| 6 — Psicologia/cognição | Parcial | Resultados existentes eram exibidos; faltava registro profissional e separação de notas restritas. |
| 7 — Metas | Não concluída | Sem persistência de objetivos de 90 dias. |
| 8 — Longitudinal | Parcial | Escalas existentes eram exibidas, mas não havia ciclo baseline/90/180/365 persistido. |
| 9 — MAPA 55+ | Não concluída | Documento específico inexistente. |
| 10 — RBAC multiprofissional | Não concluída | Autorização global mantinha apenas ADMIN/PHYSICIAN/READ_ONLY. |
| 11 — QA completo | Parcial | CI geral e smoke estavam verdes; faltavam testes específicos das entidades novas. |
| 12 — Deploy progressivo | Parcial | Deploy do dashboard comprovado; faltavam as áreas persistentes. |

## Decisões arquiteturais desta entrega

1. **Uma pessoa → um prontuário → múltiplas linhas de cuidado.** Todas as novas entidades usam o `Patient.id` existente; não existe cadastro paralelo.
2. **Migration exclusivamente aditiva.** Apenas novas tabelas, índices e FKs. Nenhuma coluna clínica existente é removida, renomeada ou reinterpretada.
3. **ConsultationType preservado.** Checkpoints podem referenciar uma consulta coordenadora opcional sem criar novo tipo de consulta.
4. **Escalas preservadas.** `ScaleDefinition` e `ScaleAssessment` continuam como fonte única. Nenhum escore ou ponto de corte é duplicado.
5. **RBAC aditivo sem alterar o mecanismo das três médicas.** O papel global existente não é modificado. Uma tabela de participação profissional do Programa 55+ acrescenta `ProfessionalDiscipline` e controla escrita do próprio domínio. PHYSICIAN/ADMIN mantêm as permissões clínicas já consolidadas.
6. **Psicologia com separação explícita.** Resumo compartilhável fica na avaliação profissional; notas restritas ficam em entidade separada e não entram no resumo integrado/MAPA 55+.
7. **Tera Science sem integração direta.** Apenas origem manual/documental pode ser registrada. Não há scraping, credencial no frontend ou API inventada.
8. **GLIM/GLIN sem automação diagnóstica nesta entrega.** O prompt manda não inventar critérios, pontos de corte ou diagnósticos. O domínio de nutrição aceita dados estruturados e conclusão registrada pelo profissional, mas não calcula automaticamente GLIM sem validação clínica/documental específica.
9. **Disponibilidade definitiva 55–70.** A instrução posterior da product owner determinou disponibilidade por padrão para 55–70 anos. `PROGRAM55_EMERGENCY_DISABLED=true` permanece como kill switch operacional. Essa decisão posterior substitui o opt-in originalmente descrito em `FEATURE_PROGRAM_55`.

## Escopo de conclusão desta entrega

- enrollment único por paciente elegível;
- checkpoints BASELINE, DAY_90, DAY_180 e YEAR_1 com datas planejadas;
- composição corporal manual, estruturada e longitudinal;
- registros multiprofissionais por domínio/checkpoint;
- resumo psicológico compartilhável e nota restrita separada;
- metas pactuadas de 90 dias;
- visão longitudinal por checkpoint;
- MAPA 55+ imprimível;
- autoria e `AuditEvent` para gravações;
- participação profissional aditiva e autorização por domínio;
- health check de schema do Programa 55+;
- testes de domínio, isolamento e smoke de produção.

## Itens deliberadamente bloqueados por segurança clínica/provedor

- integração automática Tera Science b.IA: exige documentação oficial de API, autenticação documentada, avaliação de segurança e autorização expressa;
- cálculo/classificação automática GLIM: exige fonte clínica validada, definição dos critérios implementáveis e revisão humana específica antes de codificar pontos de corte.

Esses bloqueios não impedem o registro manual estruturado nem o funcionamento das demais áreas.

## Rollback

Commit estável anterior: `cec8af5cf0696819193b40359ee221ebb3445d09`.

A migration é compatível com rollback de código porque apenas cria tabelas novas; a versão anterior ignora essas tabelas. Não remover as tabelas durante rollback emergencial. O rollback operacional preferido é reimplantar o commit estável anterior e manter os dados novos preservados para posterior recuperação.
