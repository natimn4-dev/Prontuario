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

## 2026-08-19 — Deduplicação robusta de sinais de atenção

Prioridade: **relatório final para família/cuidadores — clareza e consistência textual**.

### Alterações
- a deduplicação de `Sinais de atenção` passou a reconhecer como equivalentes textos que diferem apenas por caixa tipográfica, espaços repetidos ou forma Unicode compatível;
- a primeira redação continua sendo preservada integralmente no relatório;
- textos realmente diferentes continuam sendo mantidos, sem tentativa de equivalência semântica ou interpretação clínica.

### Testes adicionados
- `tests/golden-master/document-renderers.test.ts` agora cobre variações de maiúsculas/minúsculas e espaçamento provenientes de fontes distintas, garantindo uma única ocorrência e preservação da primeira redação.

### Limites preservados
- nenhuma orientação clínica, regra de urgência, escore, interpretação ou intervenção foi modificada;
- a normalização é usada apenas como chave de comparação e não altera o texto exibido ao paciente/família;
- nenhuma salvaguarda de identidade ou persistência documental foi removida.

## 2026-08-19 — Modelo estruturado para tabela de medicamentos

Prioridade: **tabela de medicamentos — clareza, segurança de apresentação e preparação da UI**.

### Alterações
- criado `MedicationPlanRow`, um modelo explícito de uma linha por medicamento;
- cada horário (`manhã`, `almoço`, `tarde`, `noite`, `ao deitar`, `se necessário`) passa a ser exposto como estado booleano independente no modelo de apresentação;
- `buildMedicationPlanRows` reaproveita integralmente a validação existente antes de produzir as linhas;
- `renderMedicationPlanText` passou a renderizar a partir desse modelo estruturado, preservando o conteúdo textual atual e a regra de manter frequência/horários fora do campo de nome e dose.

### Testes adicionados
- `tests/golden-master/medication-plan.test.ts` valida uma linha por medicamento, preservação de dose/via/uso contínuo e marcação independente dos horários, incluindo manhã + noite no mesmo item.

### Limites preservados
- nenhuma medicação, dose, via, frequência, horário ou instrução clínica é criada ou reinterpretada;
- IDs repetidos continuam sendo rejeitados;
- a regra que impede frequência/horário dentro de `medicationText` permanece ativa;
- nenhuma salvaguarda documental ou de identidade foi removida.

## 2026-08-19 — Identidade explícita no plano de medicamentos

Prioridade: **P0 — segurança/identidade do paciente em documento entregue à família**.

### Alterações
- `renderMedicationPlanText` agora exige um nome de paciente não vazio antes de montar o documento;
- nomes com quebra de linha são rejeitados para impedir cabeçalhos ambíguos ou injeção acidental de outro contexto documental;
- espaços redundantes no nome são normalizados apenas para apresentação, mantendo o conteúdo nominal informado;
- a validação acontece antes da construção do texto final e falha fechado quando a identidade exibida não é segura.

### Testes adicionados
- `tests/golden-master/medication-plan.test.ts` cobre ausência de identificação, tentativa de nome multilinha e normalização segura de espaços no cabeçalho.

### Limites preservados
- nenhuma medicação, dose, via, frequência, horário ou instrução clínica foi alterada;
- nenhuma inferência sobre identidade é feita: o renderer apenas exige que a identificação recebida seja válida para exibição;
- nenhuma salvaguarda documental ou de persistência foi removida.
