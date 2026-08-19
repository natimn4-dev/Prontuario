# Registro de melhorias autônomas

## 2026-08-19 — Integridade de contexto na geração documental

Prioridade: **P0 — vínculo paciente ↔ consulta ↔ documento**.

### Alterações
- criado `src/domain/document-context-integrity.ts` com guarda fail-closed reutilizável;
- o gerador de relatório AGA valida, antes de montar o documento, que a consulta-alvo pertence ao horizonte longitudinal calculado;
- todas as avaliações de escalas precisam pertencer ao mesmo paciente e a uma consulta dentro do horizonte;
- todos os problemas precisam pertencer ao mesmo paciente e ter origem dentro do horizonte;
- eventos de problemas precisam manter o mesmo `problemId`, `patientId` e consulta dentro do horizonte;
- qualquer inconsistência interrompe a geração em vez de produzir documento potencialmente misturado;
- a criação de `DocumentSnapshot` agora relê `patientId` e status da consulta dentro da mesma transação `Serializable` que versiona e persiste o documento;
- a busca da versão anterior do snapshot também exige o mesmo `patientId`, além de `consultationId` e tipo, reduzindo risco de mistura de contexto e eliminando a janela entre leitura prévia da consulta e persistência do documento.

### Testes adicionados
`tests/golden-master/document-context-integrity.test.ts` cobre 9 cenários explícitos de integridade, incluindo:
1. contexto válido;
2. escala de outro paciente;
3. escala em consulta fora do horizonte;
4. problema de outro paciente;
5. problema originado fora do horizonte;
6. evento associado a problema diferente;
7. evento de outro paciente;
8. evento em consulta fora do horizonte;
9. consulta-alvo fora do horizonte.

### Limites preservados
- nenhuma regra clínica foi criada ou alterada;
- nenhum escore, interpretação ou intervenção é recalculado;
- nenhuma salvaguarda existente foi removida;
- dados reais continuam proibidos até conclusão dos itens P0 de go-live.

## 2026-08-19 — Relatório familiar sem sinais de atenção duplicados

Prioridade: **relatório final para família/cuidadores — clareza e redução de redundância**.

### Alterações
- `buildFamilyReportModel` agora deduplica sinais de atenção idênticos quando o mesmo texto chega por `attentionSigns`, `plan.contato` e/ou `plan.urgencia`;
- a ordem original da primeira ocorrência é preservada;
- nenhum conteúdo clínico é criado, removido ou reinterpretado: apenas ocorrências textualmente idênticas deixam de ser repetidas no documento final.

### Testes adicionados
- `tests/golden-master/document-renderers.test.ts` valida que sinais idênticos provenientes de múltiplas fontes aparecem uma única vez no modelo e no texto renderizado.

### Limites preservados
- nenhuma regra clínica, escore, interpretação ou intervenção foi alterada;
- textos diferentes continuam sendo mantidos integralmente, mesmo quando semanticamente semelhantes;
- nenhuma salvaguarda de geração ou persistência documental foi removida.

## 2026-08-19 — Contato mais direto no relatório familiar

Prioridade: **relatório final para família/cuidadores — legibilidade e aderência ao texto aprovado**.

### Alterações
- o rodapé do relatório passa de `Quando entrar em contato com o consultório:` para `Quando entrar em contato:`;
- o telefone configurado permanece explícito imediatamente após o rótulo, sem alteração de origem ou conteúdo.

### Testes adicionados
- o golden master de renderização confirma o texto `Quando entrar em contato: 71 99992-1416` e protege contra regressão para a formulação anterior.

### Limites preservados
- nenhuma orientação clínica foi criada, removida ou reinterpretada;
- nenhuma regra de contato, urgência ou persistência foi alterada.
