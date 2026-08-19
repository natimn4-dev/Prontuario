# Backlog inicial

## P0 — Segurança e fundação

### P0-01 Vínculo paciente ↔ consulta ↔ documento
**Aceite**
- todo documento possui patientId + consultationId;
- troca de paciente limpa contexto anterior;
- teste impede mistura de dados.

**Estado atual (2026-08-19):** além das chaves compostas e guardas fail-closed já existentes nos documentos, a própria página clínica da consulta agora carrega o vínculo consulta → paciente no servidor autenticado antes de renderizar as áreas editáveis. O cabeçalho exibe nome do paciente, data de nascimento, tipo/data/status da consulta e torna visível `needsIdentityReview`; consulta inexistente não renderiza e contexto sem identificador/nome de paciente válido falha fechado. A interface não cria nem reinterpreta identidade e não altera as regras existentes para homônimos.

### P0-02 Persistência real
**Aceite**
- rascunho persiste após fechar navegador;
- erro de gravação é visível;
- finalização gera estado imutável/versionado.

**Estado atual (2026-08-19):** o workflow autenticado da consulta expõe leitura de estado, início de revisão e finalização, e a interface já está conectada aos estados Rascunho / Em revisão / Finalizada. A finalização não aceita `patientId` nem lista de alertas urgentes do navegador: paciente e alertas atuais são derivados no servidor, a revisão clínica final é obrigatória e a transição `IN_REVIEW → FINALIZED` é atômica. Alertas urgentes precisam ser reconhecidos explicitamente pelos códigos atuais fornecidos pelo servidor; códigos obsoletos ou inventados não liberam o gate. O versionamento de `DocumentSnapshot` ocorre em transação `Serializable`, relê paciente/status da consulta dentro da mesma transação e repete a operação completa, no máximo três vezes, quando Prisma sinaliza colisão de versão (`P2002`) ou conflito/deadlock serializável (`P2034`). Erros não reconhecidos continuam sendo propagados imediatamente.

### P0-03 Autenticação e autorização
**Aceite**
- somente usuário autenticado acessa prontuário;
- somente profissionais autorizados alteram conteúdo clínico;
- ações relevantes ficam auditadas.

### P0-04 AGA inicial como baseline
**Aceite**
- primeira avaliação longitudinal é AGA;
- baseline é identificável;
- consulta subsequente consegue comparar com baseline.

### P0-05 Lista longitudinal de problemas
**Aceite**
- separação clínico/geriátrico;
- problemas da AGA aparecem nas consultas seguintes;
- problema pode ser resolvido e reativado;
- histórico preservado.

### P0-06 Histórico de escalas
**Aceite**
- cada aplicação guarda versão, respostas, escore e interpretação;
- não sobrescrever avaliação anterior;
- consultas exibem tendência histórica.

## P1 — Migração funcional

### P1-01 Extrair ESCALAS do legado
### P1-02 Extrair INTERVENCOES do legado
### P1-03 Golden master tests
### P1-04 Migrar cálculo das escalas
### P1-05 Migrar lista de problemas
### P1-06 Migrar motor de plano
### P1-07 Migrar medicamentos

## P1 — Documentos

### P1-08 SOAP
- S/O/A/P;
- problemas numerados;
- plano por problema;
- “sem dados registrados” quando necessário;
- único botão “Copiar para prontuário”.

**Estado atual (2026-08-19):** o renderer de domínio já produz S/O/A/P, exame físico, sinais vitais, antropometria, medicações em uso, problemas numerados e plano por problema sem inventar dados. Existe contrato versionado e fail-closed para `Consultation.subjective`, `Consultation.objective` e `Consultation.plan`, e agora também uma auditoria operacional somente leitura (`npm run audit:soap-json`) que classifica a base real por formato vazio / contrato v1 / incompatível sem emitir nomes, IDs ou textos clínicos. `Consultation.assessment` permanece deliberadamente não suportado no contrato v1 e sua presença bloqueia a ativação automática do read path até revisão explícita. O próximo passo depende do resultado desse inventário no ambiente alvo: se a base estiver compatível, criar endpoint autenticado de leitura/gravação e testes de isolamento; se houver legado, definir migração/revisão antes de expor prévia SOAP e o único botão “Copiar para prontuário”.

### P1-09 Relatório para família
- vertical;
- problemas clínicos e geriátricos separados;
- linguagem acessível;
- orientações práticas;
- sinais de atenção;
- impressão A4.

**Estado atual (2026-08-19):** estrutura A4 vertical, separação clínico/geriátrico, revisão clínica antes do compartilhamento e apêndice técnico opcional estão implementados. A tabela principal destinada a família/cuidadores mostra nome da avaliação, resultado/classificação, evolução desde a última avaliação, evolução desde a AGA inicial e interpretação registrada. Código/versão, identificador interno de consulta e trajetória numérica técnica não aparecem mais nessa tabela; a rastreabilidade técnica permanece no apêndice e no snapshot. O renderer textual também elimina repetições de sinais de atenção quando o mesmo texto chega por fontes diferentes, considerando apenas variações de caixa, espaços e forma Unicode e preservando integralmente a primeira redação; textos realmente diferentes não são consolidados. O rótulo de contato foi simplificado para “Quando entrar em contato”.

### P1-10 Tabela de medicamentos
- nome/apresentação;
- dose;
- via;
- horário;
- instrução;
- fácil leitura por cuidador.

**Estado atual (2026-08-19):** o editor mantém nome/dose separados dos horários estruturados e há uma tabela reutilizável orientada ao cuidador com medicamento, dose, via, marcação visual/textual dos momentos, uso contínuo e observações, incluindo layout responsivo e impressão. Texto e tabela compartilham um único `MedicationPlanViewModel` validado no domínio, com uma linha por medicamento e estado booleano independente para cada horário; o cabeçalho falha fechado se não houver paciente identificado ou se o nome tentar ocupar múltiplas linhas. O domínio possui um corte temporal conservador de `MedicationRegimen` por horizonte de consulta e agora também um contrato testado para reconstruir status exclusivamente a partir de eventos explícitos `ACTIVE` / `SUSPENDED` / `FINISHED`. Quando não há evento explícito até o horizonte, o status permanece desconhecido; `Medication.status` atual não participa da projeção histórica. Ainda falta persistir esses eventos no schema/banco, sem backfill inferido, antes de ligar a tabela aos snapshots reais de `MEDICATION_PLAN`.

## P1 — Evolução
### P1-11 Dashboard “O que mudou?”

**Estado atual (2026-08-19):** o domínio longitudinal produz headline, narrativa e contagens de tendência, e a camada de apresentação testada agora está conectada ao dashboard visual do relatório. A interface renderiza os seis estados do view model — desfavorável, favorável, estável, não comparável, dados insuficientes e alertas urgentes — sem recalcular regras no React. “Não comparável” e “dados insuficientes” permanecem neutros e não são apresentados como estabilidade.

### P1-12 Gráficos de escalas

**Estado atual (2026-08-19):** a fundação de domínio para séries gráficas longitudinais está integrada ao modelo do relatório. A visualização recebe a série histórica completa, ordenada e consolidada pelo domínio; linhas são desenhadas somente nos segmentos explicitamente comparáveis, preservando lacunas por mudança de versão ou score ausente. A camada de apresentação mantém a seção histórica e a tabela textual mesmo quando ainda não existem dois escores numéricos para desenhar uma trajetória. Em históricos longos, todos os pontos e todos os registros da tabela continuam presentes, mas os rótulos de data do SVG são reduzidos de forma determinística, preservando extremos e baseline; na tela o gráfico pode ser rolado horizontalmente com foco por teclado e, na impressão, volta a caber na largura disponível. O gráfico não recalcula score, classificação ou direção clínica e não usa cor como único indicador. Permanece como refinamento futuro uma seleção explícita de janela temporal pelo usuário, sem descarte do histórico completo.

### P1-13 Comparação consulta anterior × baseline

**Estado atual (2026-08-19):** a tabela longitudinal do relatório passa a exibir separadamente a tendência validada desde a última avaliação e desde a AGA inicial. Ambos os estados vêm do domínio clínico; o React apenas rotula os valores já calculados. “Não comparável” e “dados insuficientes” são preservados explicitamente, sem inferência de estabilidade ou significância clínica.

## P2 — Refinamentos
- atalhos de produtividade;
- personalização visual;
- relatórios adicionais;
- melhorias de impressão;
- exportações administrativas.
