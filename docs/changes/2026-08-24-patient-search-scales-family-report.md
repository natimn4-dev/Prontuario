# Busca de paciente, escalas estruturadas e relatório familiar — 2026-08-24

## Escopo

- reforço da busca da página inicial para localizar registros legados mesmo quando `normalizedFullName` estiver desatualizado;
- preenchimento estruturado de Barthel, FRAIL-BR e MNA-SF, com cálculo automático e preservação das faixas já validadas pelo aplicativo;
- tabela familiar limitada aos domínios efetivamente avaliados na consulta alvo;
- remoção de orientações genéricas, conteúdo incompleto e do bloco duplicado de capacidade intrínseca;
- bloco fixo de sinais de urgência e contato com a equipe;
- gráfico longitudinal exibido somente após dois resultados comparáveis do mesmo instrumento e versão.

## Regras clínicas preservadas

- não houve mudança nos pontos de corte ou na classificação de Barthel, FRAIL-BR e MNA-SF;
- respostas incompletas falham antes da pontuação e não entram no relatório;
- instrumentos e versões incompatíveis não são conectados no gráfico;
- as orientações continuam sujeitas à revisão clínica explícita antes da impressão ou exportação.

## Base científica usada nas orientações familiares

- quedas em pessoas idosas: diretriz mundial, PMID `36178003`;
- sintomas neurológicos agudos: diretriz AHA/ASA, PMID `34024117`;
- delirium e confusão aguda: revisão clínica, PMID `28973626`;
- nutrição e hidratação geriátrica: diretriz ESPEN, PMID `30005900`;
- exercício multicomponente em idosos: consenso internacional, PMID `34409961`;
- revisão de medicamentos: STOPP/START v3, PMID `37256475`, e STOPPFall, PMID `33349863`;
- avaliação geriátrica em oncologia: diretriz ASCO, PMID `37459573`;
- apoio estruturado ao cuidador: REACH II, PMID `29233097`;
- intervenções funcionais em atividades diárias: revisão sistemática, PMID `29953830`;
- cuidados paliativos e desfechos: meta-análise, PMID `27893131`.

## Validação automatizada

- cálculo e incompletude das três escalas estruturadas;
- omissão de domínios históricos ou não avaliados;
- ausência dos textos genéricos proibidos e do bloco duplicado;
- presença e versionamento do bloco fixo de segurança;
- bloqueio do gráfico sem baseline comparável;
- busca por índice canônico, nome-fonte e fallback legado limitado.

## Release verificável

O health check desta revisão publica `2026-08-24-patient-search-scales-family-report-v2`, permitindo que o smoke de produção espere a implantação exata em vez de aceitar uma versão anterior ainda saudável. Respostas de rotas protegidas também recebem `private, no-store` e `Vary: Cookie`, impedindo que a CDN reutilize uma página clínica autenticada para uma requisição anônima.
