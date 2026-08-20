# Restauração das escalas geriátricas complementares

Data: 2026-08-20

## Objetivo

Recuperar instrumentos que estavam disponíveis nas primeiras versões do aplicativo e deixaram de aparecer no fluxo após a reformulação, sem desfazer a governança Freitas/Py nem reproduzir formulários eletrônicos protegidos.

## Escalas restauradas no fluxo

O novo bloco **Escalas complementares e registro rápido** permite registrar o resultado de instrumentos já aplicados para:

- MoCA — apenas pontuação;
- MEEM — pontuação + escolaridade para contextualização;
- Índice de Barthel;
- Cornell;
- CAM — conclusão positiva/negativa de um CAM já aplicado;
- 10-CS;
- FRAIL-BR;
- SARC-F;
- força de preensão palmar;
- velocidade de marcha;
- sentar-levantar 5 vezes;
- polifarmácia / medicamentos potencialmente inapropriados;
- STOPPFall;
- KPS;
- LACE;
- G8;
- VES-13;
- MNA-SF;
- Charlson;
- FAST;
- PPS;
- ESAS — total global.

Katz, Lawton, GDS-15, Pfeffer 10 itens, SPPB, POMA, Mini-Cog, IQCODE-Br e demais versões já migradas em Freitas/Py não são duplicadas neste bloco.

## MoCA e MEEM

Os campos rápidos não reproduzem os formulários completos. Isso preserva a utilidade clínica solicitada e mantém as salvaguardas existentes de licenciamento para reprodução eletrônica dos instrumentos completos.

A interpretação é apresentada como rastreio/contextualização e nunca transforma o escore isolado em diagnóstico automático.

## Persistência e longitudinalidade

Os resultados são persistidos em `ScaleAssessment` com o código clínico histórico correspondente. Assim, entram no relatório AGA, histórico longitudinal e gráficos quando houver série comparável.

## Segurança do relatório para paciente/família

Foi acrescentada uma camada de sanitização específica do relatório compartilhado. Orientações com conteúdo de conduta médica ou farmacológica são removidas da versão destinada a paciente/família, incluindo exemplos como:

- prescrição/início/suspensão/troca automática de medicamentos;
- hipolipemiantes/estatinas;
- vitamina D ou reposição de suplementos;
- ajuste/reavaliação de doses;
- desprescrição;
- investigação diagnóstica descrita como conduta automática.

Orientações de segurança como **não alterar medicamentos por conta própria** permanecem permitidas.

O conteúdo clínico interno continua disponível para revisão profissional; a filtragem ocorre na geração do relatório compartilhado.

## Plano de medicamentos

A restauração das escalas não altera o contrato do plano de medicamentos. O documento destinado ao paciente/cuidador continua em tabela própria, com uma linha por medicamento, nome/dose separados dos horários estruturados e marcações para manhã, almoço, tarde, noite, ao deitar e se necessário. O CSS de impressão A4 permanece preservado.

## Testes adicionados

- inventário das escalas complementares restauradas;
- interpretação de MoCA e MEEM sem diagnóstico automático;
- cortes históricos de Barthel, FRAIL-BR, SARC-F e mobilidade;
- conclusão CAM e urgência clínica;
- semântica de FAST/PPS;
- ausência de prescrição automática nas escalas relacionadas a medicamentos;
- filtro do relatório familiar para vitamina D, hipolipemiantes, prescrição e ajuste de doses.
