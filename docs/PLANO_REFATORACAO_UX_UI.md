# Prontuario — análise do repositório e plano de refatoração de UX/UI

**Data:** 05/09/2026. **Referência:** `main`, commit `ff8fbcb38bc401f73eae06bf9315a35d728b7acd`. **Estado:** proposta para revisão; não implementada.

## 1. Parecer executivo

Recomendo uma refatoração incremental por jornada clínica, preservando o domínio, os contratos de segurança e o PA-CDS, design system já aprovado. O ganho principal está em tornar inequívocos o contexto do paciente, o que foi salvo, o que ainda precisa de revisão e qual documento será assinado.

O produto já possui funcionalidades muito além do scaffold descrito no README: consulta por etapas, SOAP com plano por problema, escalas estruturadas, reconciliação de medicamentos, diretivas antecipadas, documentos versionados, dois provedores de assinatura, Programa 55+ e Oncogeriatria. O plano deve tratar essa aplicação existente como base, evitando repetir funcionalidades já entregues.

As três prioridades são: proteger rascunhos em todas as transições; vincular a revisão e a assinatura à versão exata do documento exibido; e unificar navegação, estados e formulários. A consolidação visual e a melhoria de impressão devem acompanhar esse trabalho.

### Alcance e limites da evidência

Esta é uma análise estática aprofundada do repositório, complementada por execução de testes e verificações de tipagem. **Não é uma auditoria visual ou uma homologação clínica completa.** A política do navegador bloqueou a abertura da demonstração local; não foram capturadas telas nem percorridos fluxos autenticados. Não houve acesso a pacientes reais, banco de produção ou provedores de assinatura.

Os termos usados abaixo distinguem:

- **Confirmado no código:** implementação diretamente observada na revisão.
- **Risco derivado:** consequência plausível dessa implementação, ainda sem reprodução em navegador.
- **Hipótese de UX:** recomendação a validar com profissionais e observação de tarefas.

Não foram medidos tempo de consulta, satisfação, Web Vitals, contraste renderizado ou cortes de impressão. As metas propostas não são resultados atuais.

## 2. Retrato técnico que afeta UX/UI

| Item | Estado observado |
| --- | --- |
| Stack declarada no package.json | Next.js 16.3.1, React 19.2.0, TypeScript, Prisma e MariaDB/MySQL |
| Rotas de página | 25 arquivos `page.tsx` |
| Endpoints de API | 28 arquivos `route.ts` em `src/app/api` |
| Componentes | 38 arquivos TSX em `src/components` |
| Estilos | 27 arquivos CSS; cinco folhas globais importadas pelo layout, somando 1.700 linhas |
| Código de domínio | 109 arquivos, 13.095 linhas |
| Testes golden master | 132 arquivos de teste; 651 testes executados com sucesso |
| Cobertura estática da interface | 49 dos 132 arquivos de teste leem arquivos-fonte; isso não significa que todos os seus testes sejam apenas estáticos |
| Integração | Cinco arquivos de testes de integração, não executados nesta análise por ausência de banco de teste provisionado |
| Maiores componentes | SOAP: 624 linhas; documento AGA: 554; workspace de escalas: 506 |
| Maiores folhas de estilo | Documento AGA: 1.096 linhas; CSS global de relatório: 916 |

Tamanho de arquivo é sinal de custo de manutenção, não evidência isolada de lentidão. Há mistura de folhas globais, sobreposições tardias, CSS Modules e estilos inline. Não há necessidade demonstrada de trocar framework, banco ou biblioteca de gráficos para resolver os achados.

**Validação realizada:** `npm ci --ignore-scripts`, geração do Prisma Client usando URL local fictícia, `npm test`, `npm run typecheck:domain` e `npm run typecheck`. Resultados finais: 651/651 testes e ambas as verificações TypeScript aprovadas. A geração de cliente não aplicou migrations nem acessou dados clínicos. O ambiente disponível usa Node 24.19.0; o projeto declara Node 22.x. Portanto, esses resultados não substituem o CI no runtime declarado. Uma primeira execução prematura de testes, antes de terminar a instalação, falhou por módulos ainda ausentes; a execução posterior completa passou.

O build de produção não foi executado: o script encadeia migrations e verificações de prontidão. A consulta do GitHub não retornou PRs ou issues abertas naquele momento. A consulta de status combinado retornou uma lista vazia; **isso não comprova CI verde nem ausência de execuções de GitHub Actions**.

Fontes: [package.json](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/package.json), [layout](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/app/layout.tsx), [CI](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/.github/workflows/ci.yml), [design system](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/docs/design-system/README.md).

## 3. O que deve ser preservado

1. Uma identidade de paciente compartilhada pelas diferentes linhas de cuidado.
2. Isolamento paciente–consulta, horizonte temporal, histórico e versões dos instrumentos.
3. Regras clínicas implementadas no domínio testado; React organiza a apresentação.
4. Problemas clínicos e geriátricos distinguíveis, com histórico dos resolvidos.
5. Sugestões identificadas como sugestões, editáveis e dependentes de decisão profissional.
6. Plano/condutas como editor único dentro do SOAP. A auditoria de agosto já corrigiu sua duplicação.
7. Carregamento progressivo dos workspaces. Essa melhoria já está implementada.
8. Busca com distinção entre erro, acesso negado e ausência de resultado; proteção de homônimos.
9. Relatório AGA e plano de medicamentos como documentos separados; diretivas também têm assinatura própria.
10. Gráfico longitudinal aprovado com trajetórias por dimensão, texto equivalente, ausência de dado explícita e nenhuma média global artificial.
11. Paleta roxa, superfícies claras e marca profissional do PA-CDS.
12. Controles existentes para instrumentos sujeitos a licença; refatoração visual não libera instrumentos bloqueados.

Fontes: [AGENTS.md](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/AGENTS.md), [skill clínica](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/.agents/skills/frontend-clinical-design/SKILL.md), [governança PA-CDS](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/docs/design-system/GOVERNANCE.md), [auditoria anterior](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/docs/audits/2026-08-28-ux-performance-audit.md).

## 4. Jornadas e diagnóstico

As jornadas abaixo foram reconstruídas a partir das rotas e componentes, sem observação de uso real. Os perfis são hipóteses sustentadas pelas funções do produto: médica geriatra, profissional multiprofissional autorizado, administrador e leitor autorizado. Família/cuidador é público das saídas; não foi identificado um portal próprio para esse público.

| Etapa | Jornada | Saúde observada no código | Próxima melhoria |
| --- | --- | --- | --- |
| 1 | Entrar com conta autorizada | Acesso explícito; apresentação diverge da paleta atual | Unificar aparência e orientar recuperação de sessão |
| 2 | Localizar paciente existente | Boa separação de estados; busca canônica | Tornar a busca o foco inicial e facilitar retomada |
| 3 | Cadastrar e resolver homônimo | Proteção de duplicidade existe; cliente frágil a falha de rede | Estado de envio, recuperação e comparação de identidade |
| 4 | Rever histórico e abrir consulta | Contexto longitudinal existe; enums e datas inconsistentes | Resumo clínico, identidade persistente e retomada evidente |
| 5 | Preencher evolução e plano | Editor único e controle de versão; rascunho local | Estado de salvamento global e recuperação de conflitos |
| 6 | Aplicar escalas | Agrupamento e seleção explícita; respostas podem ser resetadas | Rascunho por instrumento e campos acessíveis |
| 7 | Reconciliar medicamentos e problemas | Histórico e confirmações explícitas | Pendências visíveis e integração com revisão final |
| 8 | Registrar diretivas | Versionamento e histórico | Explicitar autoria, revisão e documento correspondente |
| 9 | Gerar, revisar, imprimir e assinar | Snapshots existem; estados da interface separados | Amarrar prévia, revisão e assinatura ao mesmo snapshot |
| 10 | Finalizar consulta | Revisão e alertas; consulta finalizada protegida no servidor | Bloquear encerramento com rascunhos locais pendentes |
| 11 | Acompanhar Programa 55+ | Ciclos, metas e equipe implementados | Navegação ativa, checkpoint inequívoco e menos reloads |
| 12 | Acompanhar Oncogeriatria | Episódios, tratamentos e reavaliações implementados | Contexto de episódio persistente e padrão de navegação comum |

## 5. Achados priorizados

**P0:** risco de perda ou divergência de registro/revisão; tratar antes da expansão visual. **P1:** fricção relevante, acessibilidade e continuidade das tarefas. **P2:** consistência, manutenção e otimização dependente de medição.

### F01 — Respostas de escalas são substituídas ao trocar instrumento — P0

**Confirmado no código:** existe um único estado `answers`. Um efeito dependente de `activeOption?.key` e `oncogeriatricPrefills` redefine as respostas, frequentemente para `{}`. Trocar a escala ativa não mantém um rascunho por instrumento. A chegada tardia do pré-preenchimento também reexecuta esse efeito.

**Risco derivado:** perder preenchimento parcial ao alternar A → B → A ou ao receber dados auxiliares enquanto se digita. A preservação de workspaces visitados não resolve a troca interna de instrumentos.

**Refatoração:** armazenamento de rascunhos em memória por paciente, consulta, instrumento e versão. Pré-preenchimento inicializado uma única vez em campos intocados, com origem e data. Oferecer salvar ou descartar quando realmente necessário. Não gravar valores históricos como nova aplicação sem confirmação.

**Cenário de aceite:** preencher parte de A, abrir B, voltar a A e receber resposta tardia de pré-preenchimento; todas as respostas manuais permanecem. [Evidência](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/components/scales/clinical-scales-workspace.tsx).

### F02 — Rascunhos locais não participam do encerramento global — P0

**Confirmado no código:** SOAP controla `dirty` localmente. O finalizador mantém outro estado, obtém `/workflow` e não recebe a situação dos rascunhos dos módulos. Não foi encontrado `beforeunload` nos componentes e rotas examinados. O workspace preserva componentes durante troca de etapa, mas não garante recuperação após recarregar ou sair da consulta.

**Risco derivado:** finalizar uma consulta com mudanças visíveis apenas em memória; sair e perder alterações; continuar vendo um formulário com estado antigo após atualização de outra etapa. O bloqueio de gravação no servidor reduz risco de alteração indevida, mas não evita perda de trabalho ou confusão.

**Refatoração:** registro comum de estados `sem alterações`, `não salvo`, `salvando`, `salvo`, `falha` e `conflito`. O finalizador consulta esse registro e leva ao módulo pendente. Proteção de navegação interna e aviso de saída quando suportado pelo navegador. Não introduzir armazenamento clínico persistente no navegador como solução automática.

**Aceite:** editar SOAP, abrir Finalizar e tentar encerrar; a interface aponta a alteração pendente e não envia a finalização. Após finalização confirmada, todos os módulos visitados refletem somente leitura. [Workspace](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/components/consultations/consultation-workspace.tsx), [SOAP](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/components/consultations/soap-editor.tsx), [finalizador](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/components/consultations/consultation-finalization-panel.tsx).

### F03 — Assinatura não recebe a versão da prévia exibida — P0

**Confirmado no código:** `AgaReportDocumentPreview` mantém `generated` e sua confirmação de revisão. `VidaasSignaturePanel` é um componente irmão, com outras confirmações, e envia corpo `{}`. A rota admite `snapshotId`, mas, se ausente, seleciona a última prévia da mesma consulta gerada pelo profissional. O serviço verifica esse snapshot por identidade, consulta e autor.

**Risco derivado:** em duas abas, a médica revisa a versão A, outra aba gera B e o comando de assinatura escolhe B. Não é evidência de assinatura incorreta ocorrida, nem de mistura entre pacientes; é uma lacuna entre a versão visível e a versão solicitada.

**Refatoração:** compartilhar um descritor imutável do documento — paciente, consulta, tipo, snapshot, versão e autoria — entre prévia, revisão e assinatura. Enviar explicitamente o `snapshotId` já aceito pelo endpoint e validá-lo no servidor. Invalidar confirmação quando a versão muda. Tratar “dados alterados desde a geração” separadamente de “documento revisado”.

**Aceite:** duas abas e duas versões; assinar A só pode solicitar A. Atualizar prévia limpa a revisão e exige nova confirmação. [Prévia](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/components/reports/aga-report-document-preview.tsx), [assinatura](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/components/reports/vidaas-signature-panel.tsx), [rota](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/app/api/consultations/%5Bid%5D/reports/aga/signatures/vidaas/route.ts), [serviço](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/server/signatures/digital-signature-service.ts).

### F04 — A navegação apresenta módulos como um assistente sequencial — P1

O workspace abre em SOAP, terceira posição, e exibe “3 de 7”. Esse contador representa posição, não progresso. Não mostra módulos pendentes, rascunhos ou impedimentos. `replaceState` também não cria uma entrada de histórico por mudança de área.

Propor navegação livre por áreas com estados reais, mantendo atalhos. Se houver progresso, calculá-lo apenas a partir dos requisitos aplicáveis àquela consulta; abrir uma área não significa concluí-la. Definir e testar o comportamento de Voltar/Avançar. [Evidência](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/components/consultations/consultation-workspace.tsx).

### F05 — Contexto e salvamento não permanecem igualmente evidentes — P1

A identidade completa está no cabeçalho da consulta; o elemento sticky atual é a navegação, que não inclui a identidade. A faixa “Dados vinculados à consulta atual” é estática e não representa persistência. O antigo `ConsultationSectionNav`, que inclui cartão de paciente, não é importado na página atual.

Criar cabeçalho compacto persistente com nome, nascimento, consulta, estado e alerta de homônimo. Separar vínculo de contexto do estado real de salvamento. [Página](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/app/consultations/%5Bid%5D/page.tsx), [estilo da navegação](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/components/consultations/consultation-workspace.module.css).

### F06 — Cadastro sem estado de envio e recuperação de falha de rede — P1

`PatientForm` não possui `try/catch`, indicador de envio nem bloqueio de submissão concorrente. O alerta mostra `duplicate.reason` diretamente. Não há limpeza explícita da sinalização de duplicidade ao alterar os campos usados na comparação.

Adicionar ciclo de envio completo, mensagens recuperáveis e tradução dos motivos. Mostrar informações suficientes para distinguir homônimos, conforme permissão, mantendo as regras do servidor. Falha de rede nunca deve ser tratada como autorização para cadastrar novamente. [Evidência](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/components/patients/patient-form.tsx).

### F07 — A home dedica espaço a explicar o produto — P1, hipótese de UX

Antes/depois da busca há apresentação extensa, módulos explicativos e avisos de implementação. Para uso recorrente, isso pode atrasar a identificação da ação principal. A busca já tem boa base de estados e não precisa ser reconstruída.

Propor home operacional com busca em destaque, retomada autorizada de atendimentos e acesso às linhas de cuidado. Conteúdo introdutório vira ajuda contextual. A lista de recentes é nova funcionalidade e precisa respeitar escopo de acesso; validar necessidade antes de implementá-la. [Home](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/app/page.tsx), [busca](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/components/patients/patient-finder.tsx).

### F08 — Textos internos e padrões de data divergem — P1

O histórico do paciente imprime `consultation.type` e `consultation.status` diretamente, com data ISO; a consulta possui view model com rótulos. O login usa cores antigas inline e Arial, enquanto o design system define roxo e outra stack. Há textos recorrentes sobre carregamento, servidor, snapshot e proteção arquitetural em áreas operacionais.

Centralizar formatação e vocabulário em português. Exibir tecnologia só quando ela ajuda uma decisão; instruções sobre rascunho, revisão e consequência de finalizar devem continuar claras. Migrar login para tokens preservando o fluxo OAuth. [Paciente](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/app/patients/%5Bid%5D/page.tsx), [login](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/app/login/page.tsx), [tokens](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/docs/design-system/TOKENS.md).

### F09 — Campos de escalas têm associação de rótulos incompleta — P1

No renderizador, campos numéricos, textuais e alguns selects aparecem após um `span`; não recebem `id`/`htmlFor` nem `aria-labelledby`. Os grupos de rádio têm semântica mais completa. A ausência de nome programático é confirmável na composição do código; a experiência com leitor de tela ainda precisa ser testada.

Extrair `ClinicalField` com label associado, ajuda, unidade, erro e `aria-invalid`. Criar identificadores que incluam instrumento e consulta para evitar colisões. [Evidência](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/components/scales/clinical-scales-workspace.tsx).

### F10 — Estados ausentes precisam permanecer distintos de respostas negativas — P1, revisão clínica necessária

Checkboxes de escalas mostram “Ausente” quando não marcados; `preparedAnswers` converte ausência de interação em `"0"` para esse tipo de campo. Esse comportamento existe, mas sua correção depende do contrato de cada instrumento.

Inventariar quais perguntas permitem ausência implícita e quais exigem observação explícita. Onde aplicável, usar “Não informado / Presente / Ausente”. Qualquer mudança na interpretação da entrada exige documentação, revisão clínica e testes; não converter globalmente todos os checkboxes. [Renderizador](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/components/scales/clinical-scales-workspace.tsx), [restrições clínicas](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/AGENTS.md).

### F11 — Contratos de acessibilidade não estão integralmente materializados — P1

As abas do relatório têm `role=tab`, mas não implementam no trecho examinado associação completa a `tabpanel`, foco móvel e operação por setas. O CSS da navegação usa metadados de 9–10 px e anéis de foco translúcidos, que exigem medição renderizada. Não foi encontrado tratamento de movimento reduzido nos arquivos de interface pesquisados.

Adotar padrões WAI-ARIA onde se usam widgets ARIA. Definir meta WCAG 2.2 AA, testar teclado, zoom, reflow e foco não encoberto. Cor/texto e dimensão do alvo devem ser medidos; tamanho pequeno de fonte, isoladamente, não demonstra violação WCAG. [Relatório](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/components/reports/aga-report-document-preview.tsx), [acessibilidade PA-CDS](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/docs/design-system/ACCESSIBILITY.md), [WCAG 2.2](https://www.w3.org/TR/WCAG22/), [padrão de abas](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/).

### F12 — Impressão privilegia densidade acima da diretriz clínica — P1

A tabela de medicamentos define 8 pt e cabeçalhos de 7 pt em impressão. O documento AGA define corpo de 10,5 pt e tabelas de 8,5 pt. A skill clínica orienta evitar corpo abaixo de 11 pt. Há também rótulos pequenos nos gráficos.

Tratar como divergência interna de legibilidade a resolver com prévia A4 e leitores representativos. Aumentar legibilidade, aceitar mais páginas e reorganizar cabeçalhos antes de reduzir conteúdo. Manter todos os horários e a separação dos documentos. A largura mínima de tabelas em mobile deve ser avaliada como região de rolagem com contexto preservado, não como motivo automático para excluir colunas. [Medicamentos](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/app/consultations/%5Bid%5D/medications/print/page.module.css), [AGA](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/components/reports/aga-report-document-preview.module.css).

### F13 — Consolidação de CSS e componentes está incompleta — P2

O layout importa estilos globais de relatório e sobreposições para todas as páginas. Sete exportações de componentes antigos aparecem sem consumidores encontrados em `src`/`scripts`: `ConsultationSectionNav`, `AgaReportPreview`, `GeriatricConductWorkspace`, `AgaCoreScales`, `ComplementaryScoreScales`, `OncogeriatricScales` e `MedicationEditor`.

São candidatos a limpeza, não autorização para exclusão automática: verificar referências, testes, documentação e eventual uso externo antes. Consolidar estilos por superfície; manter tokens globais e limitar folhas de impressão/documento. Validar o grafo e a cascata antes de remover overrides. [Layout](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/app/layout.tsx), [componentes](https://github.com/guedesle/Prontuario/tree/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/components).

### F14 — Abertura de escalas faz quatro leituras e tem acoplamento de falhas — P2

Três leituras iniciais usam `Promise.all`; falha em uma impede aplicar o conjunto. A quarta, oncogeriátrica, é independente e tem aviso próprio. A auditoria anterior já reconhecia o custo; não há evidência de latência atual nesta execução.

Medir antes de mudar. Candidatos: endpoint de workspace com resultados parciais tipados ou isolamento das leituras por domínio. Uma chamada agregada só é melhoria se reduzir custo real sem enfraquecer autorização e estados de erro. Separar definições estáticas de dados do paciente. [Workspace](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/components/scales/clinical-scales-workspace.tsx).

### F15 — Programa 55+ e Oncogeriatria usam padrões de navegação distintos — P1

O Programa 55+ usa links flexíveis inline e Oncogeriatria apresenta uma sequência própria; ambos carecem de indicação de rota ativa no componente de navegação examinado. O Programa 55+ usa recarregamento completo após várias gravações, que pode interromper outros rascunhos na mesma página.

Compartilhar navegação, feedback e cabeçalho de contexto. Preservar as diferenças entre consulta, ciclo/checkpoint e episódio/tratamento. Substituir reloads por atualização controlada quando houver rascunhos e garantir que a interface continue refletindo o estado persistido. [Programa](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/components/program55/program55-nav.tsx), [formulários](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/components/program55/program55-forms.tsx), [Oncogeriatria](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/components/oncogeriatria/oncogeriatric-nav.tsx).

### F16 — Rótulos de assinatura e finalização podem confundir operações — P1

O painel usa “Finalizar e assinar”, enquanto há uma etapa distinta de finalização da consulta. O endpoint examinado inicia assinatura de snapshot; a rotulagem não esclarece suficientemente o objeto finalizado. Prévia, assinatura e finalizador mantêm confirmações separadas.

Usar ações com objeto explícito: “Revisar relatório”, “Assinar esta versão” e “Finalizar consulta”. Não eliminar revisões distintas por conveniência; explicitar propósito e vínculo de cada uma. Exibir estado de provedor, documento assinado, cancelamento e retorno com continuidade do contexto. [Assinatura](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/components/reports/vidaas-signature-panel.tsx), [finalizador](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/src/components/consultations/consultation-finalization-panel.tsx).

### F17 — Testes de estrutura não demonstram experiência funcional — P1

Parte da cobertura valida strings, classes e estrutura por regex. Isso protege contratos importantes, mas não detecta resposta apagada por efeito React, ordem de foco, rascunho em outra etapa, duas abas ou corte A4. O pipeline examinado não contém uma suíte de navegador para essas jornadas.

Preservar os golden masters clínicos. Acrescentar testes comportamentais de componentes e E2E dos riscos concretos; migrar asserções de detalhe de implementação somente quando houver cobertura substituta do contrato. Atualizar README e inventário para refletirem o estado vigente. [CI](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/.github/workflows/ci.yml), [teste de navegação](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/tests/golden-master/consultation-section-nav.test.ts), [README](https://github.com/guedesle/Prontuario/blob/ff8fbcb38bc401f73eae06bf9315a35d728b7acd/README.md).

## 6. Abordagens comparadas

| Abordagem | Benefício | Limite | Parecer |
| --- | --- | --- | --- |
| Correção visual localizada | Entrega rápida de contraste, fontes e espaçamentos | Mantém riscos de rascunho, revisão e contexto | Útil dentro das etapas, insuficiente como estratégia |
| Refatoração incremental por jornada | Resolve comportamento e apresentação com regressão controlada | Requer contratos de estado e validação contínua | **Recomendada** |
| Reescrita completa do front-end | Liberdade ampla de composição | Revalida grande superfície clínica e recria contratos existentes | Sem justificativa suficiente neste diagnóstico |

## 7. Experiência proposta

### Estrutura do produto

A entrada passa a privilegiar localizar/retomar o atendimento. A visão do paciente reúne identidade, consultas e acesso às linhas de cuidado. Dentro de uma consulta, um cabeçalho compacto mantém o paciente identificado e uma navegação única abre as áreas livremente. Programa 55+ e Oncogeriatria reutilizam os padrões de interação, mantendo seu contexto próprio.

| Superfície | Composição proposta | Estado que precisa ficar evidente |
| --- | --- | --- |
| Home operacional | Busca, resultados, acesso às linhas e retomada se validada | Buscando, resultado vazio, erro, sessão expirada |
| Paciente | Identidade, resumo, histórico, consulta ativa e linhas de cuidado | Identidade pendente, consulta em andamento, ausência de histórico |
| Consulta | Contexto persistente, áreas, conteúdo central e ação de salvar | O que é rascunho, salvo, em revisão e somente leitura |
| Escalas | Domínios aprovados, seleção explícita, um instrumento ativo, histórico contextual | Selecionada, em preenchimento, aplicada, histórico, indisponível |
| Medicamentos | Lista de uso, reconciliação, horários e histórico | Pendente de revisão, confirmado, suspenso e origem temporal |
| Revisão | Pendências com link direto, alterações e alertas aplicáveis | Bloqueador versus aviso; nenhuma conclusão por simples visita |
| Documentos | Prévia, versão, revisão, impressão/exportação e assinatura | Qual versão está exibida, revisada e assinada |

Não proponho uma terceira coluna permanente. Detalhes de fonte, versões e histórico podem abrir sob demanda quando ajudarem a tarefa. Isso deve ser validado em protótipo, sem alterar o gráfico aprovado.

### Contratos de apresentação e estado

- **Contexto:** identificadores de paciente/consulta e, quando aplicável, episódio/checkpoint, explícitos em view models. Limpar estados ao mudar o contexto.
- **Rascunho:** registro por módulo e versão; alterações de servidor não sobrescrevem campos locais silenciosamente. Conflito mostra versão atual e oferece recuperação sem promover sugestão automaticamente.
- **Persistência:** manter salvamento explícito inicialmente. Autosave, se desejado, será decisão separada com distinção entre rascunho salvo e registro revisado.
- **Documento:** prévia, revisão e assinatura compartilham descritor de snapshot; nova geração exige nova revisão. Não usar “mais recente” como substituto de “exibido e revisado”.
- **Pendências:** servidor permanece autoridade para permissão e elegibilidade de ações; cliente acrescenta conhecimento de rascunhos locais. Nenhum indicador de conclusão é derivado apenas de clique ou visita.
- **Campos clínicos:** rótulo, unidade, origem, data e estado de ausência padronizados; nenhum zero inventado para dado não observado.
- **Erros:** estados de rede, permissão, validação, conflito e vazio distintos. Oferecer próxima ação pertinente.

### Refatoração de componentes

Criar uma camada pequena de componentes compartilhados: `PatientContextHeader`, `WorkspaceNav`, `SaveStatus`, `ClinicalField`, `ErrorSummary`, `PendingItems`, `DocumentReviewPanel` e `EmptyState`. São nomes propostos, não componentes existentes.

Decompor `SoapEditor` por grupos de campos e ciclo de edição; separar em escalas catálogo, rascunhos, renderização de campos e envio; dividir documento AGA entre composição documental e controle de geração/revisão. Não transferir cálculos clínicos para hooks de UI.

A extração deve acontecer junto à migração de um consumidor real. Evitar uma grande biblioteca genérica antes de comprovar reutilização. Preservar CSS Modules e tokens atuais; uma migração para outra solução de estilos não é pré-requisito.

## 8. Backlog proposto e critérios de aceite

Os identificadores abaixo pertencem a este plano; não representam issues já criadas no GitHub. Tamanho relativo: P = pequeno, M = médio, G = grande, sujeito a refinamento.

| ID | Entrega | Prioridade / tamanho | Dependências | Critério de aceite principal |
| --- | --- | --- | --- | --- |
| UX-01 | Baseline visual e de tarefas com dados sintéticos | P0 / M | Nenhuma | Capturas das 12 etapas aplicáveis, cenários vazios/erro e tempos-base em ambiente autorizado |
| UX-02 | Rascunho por instrumento | P0 / M | Cenários F01 | Troca A–B–A e pré-preenchimento tardio preservam respostas; contextos não se misturam |
| UX-03 | Registro global de alterações e saída protegida | P0 / G | Cenários F02 | Navegação e finalização identificam todos os módulos não salvos; conflitos não apagam rascunho |
| UX-04 | Revisão e assinatura por snapshot explícito | P0 / M | Cenários F03 | Duas abas assinam somente a versão revisada; nova prévia invalida a confirmação |
| UX-05 | Cadastro resiliente e homônimos compreensíveis | P1 / M | Nenhuma | Envio único, erro de rede recuperável, campos preservados e duplicidade traduzida |
| UX-06 | Cabeçalho persistente e navegação por áreas | P1 / G | UX-01, UX-03 | Identidade acessível em qualquer área; estado ativo correto; histórico e teclado definidos |
| UX-07 | Home e visão do paciente orientadas à tarefa | P1 / M | UX-01, UX-06 | Localizar e retomar sem ambiguidade; enums traduzidos; sem duplicar cadastro por linha |
| UX-08 | Campos clínicos acessíveis e estados de ausência | P1 / G | UX-01, UX-02 | Nome acessível, unidade e erro em cada campo; sem mudança clínica sem revisão |
| UX-09 | Organização do SOAP e conflitos | P1 / M | UX-03, UX-08 | Plano continua único; salvar, copiar rascunho e copiar versão salva têm semântica clara |
| UX-10 | Reconciliação e revisão com pendências acionáveis | P1 / M | UX-03, UX-06 | Cada bloqueio leva à origem; revisão explícita e histórico de medicamentos preservados |
| UX-11 | Documentos legíveis e ciclo de assinatura claro | P1 / G | UX-04, UX-01 | A4 legível, documentos separados, versão explícita, retorno/cancelamento de assinatura compreensível |
| UX-12 | Padrão comum de linhas de cuidado | P1 / G | UX-03, UX-06, UX-08 | Episódio/checkpoint e rota ativos claros; notas restritas não vazam; salvar não perde outros formulários |
| UX-13 | Tokens, componentes comuns e redução de legado | P2 / G | Migração de consumidores | CSS consolidado por superfície; referências verificadas antes de remoção; sem regressão aprovada |
| UX-14 | Performance medida do workspace | P2 / M | UX-01 | Baseline e comparação de payload/requisições; erro parcial tratado; orçamento definido com evidência |
| UX-15 | Testes de interação e regressão visual | P1 / G | Começa em UX-01, acompanha todas | Casos críticos de rascunho, duas abas, foco e A4 automatizados/inspecionados |
| UX-16 | Atualização da documentação e mapa de rotas | P2 / P | Inventário desta análise | README, design system e release checklist coerentes com funcionalidades e gates atuais |

## 9. Sequência de entrega

Planejamento indicativo: cinco ciclos de aproximadamente duas semanas após estabelecer o ambiente de homologação. Hipótese de capacidade: dois profissionais de desenvolvimento, UX/QA disponível e participação clínica em checkpoints. Não é compromisso de prazo; recalibrar após o primeiro ciclo. As tarefas P0 devem ser separadas em PRs pequenas para permitir antecipação.

| Ciclo | Escopo | Resultado verificável |
| --- | --- | --- |
| 1 — Continuidade e revisão | UX-01 a UX-04; iniciar UX-15 | Rascunhos preservados, encerramento consciente e assinatura da versão exata |
| 2 — Entrada e orientação | UX-05 a UX-07; primeira extração de componentes | Encontrar paciente, abrir/retomar consulta e navegar com contexto permanente |
| 3 — Registro clínico | UX-08 a UX-10 | Formulários compreensíveis, acessíveis e consistentes; pendências levam ao ponto correto |
| 4 — Saídas e linhas de cuidado | UX-11 e UX-12 | Documentos legíveis; Programa 55+ e Oncogeriatria seguem padrões comuns |
| 5 — Consolidação | UX-13, UX-14, UX-16 e fechamento UX-15 | Limpeza segura, evidência de performance e documentação atual |

QA visual começa no primeiro ciclo e acompanha os seguintes. Risco clínico não aguarda a etapa final de qualidade. Se a capacidade for menor, manter a ordem e reduzir escopo por ciclo, sem comprimir validação.

## 10. Plano de validação

### Cenários obrigatórios

1. Pacientes sintéticos homônimos, identidade pendente e controles negativos de busca.
2. Consulta sem dados; dado não observado permanece ausente, não zero.
3. AGA inicial e retorno com baseline/anterior/atual e versões incompatíveis.
4. Escala parcialmente preenchida, troca de instrumento e resposta tardia de rede.
5. SOAP editado, alteração de problema em outra área e conflito de versão.
6. Troca de etapa, saída de rota, reload, sessão expirada e duas abas.
7. Finalização com rascunho local, alerta não revisado e consulta já finalizada.
8. Prévia A revisada, prévia B gerada em outra aba e assinatura com snapshot explícito.
9. Falha/cancelamento de assinatura e retorno ao mesmo contexto/documento.
10. Medicamentos com horários extensos, histórico desconhecido e reconciliação pendente.
11. Documento AGA longo, plano de medicamentos e diretivas impressos separadamente.
12. Programa 55+ com outro formulário em edição; Oncogeriatria com dois episódios; permissões de profissional e leitura.

### Dispositivos e acessibilidade

Conforme governança local: 1440, 1280, 768 e 390 px; acrescentar teste de reflow a 320 CSS px e zoom. Validar A4 retrato, cabeçalho repetido e ausência de clipping, sem limitar arbitrariamente o número de páginas. Testar teclado e leitor de tela com cenários curtos. Capturas apenas sintéticas.

Meta de acessibilidade: WCAG 2.2 AA; contraste de texto normal de pelo menos 4,5:1 e texto grande de 3:1; contraste não textual aplicável de 3:1. Alvos com mínimo WCAG de 24×24 CSS px ou exceção documentada; preferir 44×44 nas ações frequentes como meta de conforto, sem confundir com exigência geral AA. Foco não encoberto e associação de labels devem ser verificados no navegador. Fontes: [WCAG](https://www.w3.org/TR/WCAG22/), [alvos](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html), [foco](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum.html).

### Metas de UX propostas

| Indicador | Meta candidata | Como medir |
| --- | --- | --- |
| Rascunhos perdidos nos cenários de regressão | Zero | Testes de navegação, troca, concorrência e falha |
| Divergência entre versão revisada e solicitada para assinatura | Zero | Identificador do snapshot em cenário de duas abas |
| Sucesso nas tarefas essenciais sem ajuda | Pelo menos 90% em rodada de validação | Observar localizar, preencher, revisar e emitir com usuários representativos |
| Identificação de paciente e consulta | Disponível em todas as áreas | Inspeção funcional e visual |
| Tempo de busca/retomada | Redução candidata de 20% sobre baseline | Mesmos cenários e perfis, antes/depois; revisar a meta após baseline |
| Clareza de salvamento | Participante identifica corretamente salvo versus rascunho | Pergunta durante tarefas e comparação com estado real |
| Acessibilidade | Nenhum bloqueador conhecido nas tarefas críticas | Automação complementar, teclado e leitor de tela |
| Performance | Orçamento definido após baseline | Build de produção em homologação, aparelho/rede controlados e rota autenticada |

Começar a pesquisa formativa com 3–5 profissionais que executem as tarefas reais; incluir diferentes disciplinas se as linhas de cuidado forem parte do uso. Testar as saídas com leitores representativos de família/cuidador. A amostra serve para identificar problemas, não para afirmar representatividade estatística. Telemetria deve registrar eventos e tempos sem texto clínico ou identificadores pessoais desnecessários.

## 11. Governança de implementação e rollout

Para cada entrega: branch dedicada, teste do risco específico, implementação pequena, golden masters, integração MySQL, tipagem, build em homologação e prévia visual. A governança existente exige aprovação visual explícita antes de merge/deploy de mudanças estruturais de UI/relatório. O relatório atual entrega o planejamento solicitado; esse gate aplica-se à implementação futura.

Manter migrações aditivas quando necessárias. A maior parte da proposta pode começar no front-end; persistir revisão por documento ou ampliar rascunhos no servidor demanda contrato próprio. Se houver rollout gradual, preservar compatibilidade dos dados e poder retornar ao código anterior sem apagar histórico.

Usar a infraestrutura de implantação existente do projeto. A modernização de UX/UI não justifica migrar hospedagem. Depois do deploy, a própria governança requer confirmação de release, health e smoke autenticado; build verde isolado não basta.

### Decisões que ainda precisam de validação

- Confirmar prioridades de uso com as médicas: AGA inicial, retorno e linhas de cuidado.
- Confirmar se tablet/celular serve para registro completo ou principalmente consulta de dados.
- Aprovar prévia do cabeçalho/navegação e a solução de legibilidade A4, preservando marca e gráfico.
- Definir política de rascunho além da sessão antes de introduzir autosave ou armazenamento persistente.
- Resolver, instrumento a instrumento, qualquer ambiguidade de checkbox e dado não observado.

Essas decisões não impedem iniciar a especificação dos P0 e preparar seus cenários de teste. O próximo incremento recomendado é **rascunhos de escalas + proteção de finalização + snapshot explícito na assinatura**, seguido da prévia navegável do shell clínico com dados sintéticos.

