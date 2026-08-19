# Registro de melhorias autônomas

## 2026-08-19 — Integridade de contexto na geração documental

Prioridade: **P0 — vínculo paciente ↔ consulta ↔ documento**.

### Alterações
- criado `src/domain/document-context-integrity.ts` com guarda fail-closed reutilizável;
- o gerador de relatório AGA valida, antes de montar o documento, que a consulta-alvo pertence ao horizonte longitudinal calculado;
- todas as avaliações de escalas precisam pertencer ao mesmo paciente e a uma consulta dentro do horizonte;
- todos os problemas precisam pertencer ao mesmo paciente e ter origem dentro do horizonte;
- eventos de problemas precisam manter o mesmo `problemId`, `patientId` e consulta dentro do horizonte;
- qualquer inconsistência interrompe a geração em vez de produzir documento potencialmente misturado.

### Testes adicionados
`tests/golden-master/document-context-integrity.test.ts` cobre:
1. contexto válido;
2. escala de outro paciente;
3. evento de problema de outro paciente;
4. consulta-alvo fora do horizonte;
5. problema originado fora do horizonte.

### Limites preservados
- nenhuma regra clínica foi criada ou alterada;
- nenhum escore, interpretação ou intervenção é recalculado;
- nenhuma salvaguarda existente foi removida;
- dados reais continuam proibidos até conclusão dos itens P0 de go-live.
