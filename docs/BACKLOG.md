# Backlog inicial

## P0 — Segurança e fundação

### P0-01 Vínculo paciente ↔ consulta ↔ documento
**Aceite**
- todo documento possui patientId + consultationId;
- troca de paciente limpa contexto anterior;
- teste impede mistura de dados.

### P0-02 Persistência real
**Aceite**
- rascunho persiste após fechar navegador;
- erro de gravação é visível;
- finalização gera estado imutável/versionado.

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

### P1-09 Relatório para família
- vertical;
- problemas clínicos e geriátricos separados;
- linguagem acessível;
- orientações práticas;
- sinais de atenção;
- impressão A4.

**Estado atual (2026-08-19):** estrutura A4 vertical, separação clínico/geriátrico, revisão clínica antes do compartilhamento e apêndice técnico opcional estão implementados. O corpo principal passa a omitir metadados de escala e trajetória numérica destinados à rastreabilidade técnica, reduzindo carga cognitiva para família/cuidadores sem alterar dados clínicos.

### P1-10 Tabela de medicamentos
- nome/apresentação;
- dose;
- via;
- horário;
- instrução;
- fácil leitura por cuidador.

**Estado atual (2026-08-19):** o editor mantém nome/dose separados dos horários estruturados e há uma tabela reutilizável orientada ao cuidador com medicamento, dose, via, marcação visual/textual dos momentos, uso contínuo e observações, incluindo layout responsivo e impressão. A tabela está exercitada apenas com dados sintéticos na demonstração. O domínio agora possui um corte temporal conservador de `MedicationRegimen` por horizonte de consulta, com falha fechada para mistura de pacientes; ainda falta definir, com dados históricos explícitos, a semântica de status ativo/suspenso antes de ligar a tabela aos snapshots reais de `MEDICATION_PLAN`.

## P1 — Evolução
### P1-11 Dashboard “O que mudou?”

**Estado atual (2026-08-19):** o domínio longitudinal produz headline, narrativa e contagens de tendência, e a camada de apresentação testada agora está conectada ao dashboard visual do relatório. A interface renderiza os seis estados do view model — desfavorável, favorável, estável, não comparável, dados insuficientes e alertas urgentes — sem recalcular regras no React. “Não comparável” e “dados insuficientes” permanecem neutros e não são apresentados como estabilidade.

### P1-12 Gráficos de escalas
### P1-13 Comparação consulta anterior × baseline

## P2 — Refinamentos
- atalhos de produtividade;
- personalização visual;
- relatórios adicionais;
- melhorias de impressão;
- exportações administrativas.
