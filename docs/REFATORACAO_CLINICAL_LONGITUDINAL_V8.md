# Refatoração v8 — Centro longitudinal de cuidado geriátrico

## Objetivo

Evoluir o aplicativo de uma experiência centrada em “preencher e emitir documento” para um **centro longitudinal de apoio clínico**, preservando segurança, rastreabilidade e a decisão médica final.

A AGA inicial passa a funcionar claramente como baseline clínico. Consultas subsequentes mostram o que mudou por dimensão, mantendo histórico completo.

## Rodada multidisciplinar

### Arquiteto de software

**Diagnóstico**
- O modelo Prisma já possui estruturas adequadas para paciente, consulta, baseline, problemas persistentes, avaliações de escala versionadas e snapshots.
- O domínio clínico já diferencia comparação válida, dados insuficientes e versões incompatíveis.
- A apresentação ainda não explora todo esse potencial.

**Decisão**
- Não alterar pontos de corte nesta refatoração.
- Criar uma camada de apresentação longitudinal em cima do domínio existente.
- Consolidar um único view model para relatório compartilhado.
- Manter documento final versionado.

### UX

**Problema**
O relatório atual repete muitos cartões técnicos com peso visual semelhante, obrigando o leitor a procurar manualmente o que mudou.

**Nova hierarquia**
1. identificação;
2. resumo longitudinal;
3. alertas;
4. problemas;
5. dimensões;
6. plano de cuidado;
7. apêndice técnico.

### UI

- A4 retrato como superfície principal.
- Paleta discreta e acolhedora.
- Tipografia de alta legibilidade.
- Tabelas longitudinais compactas.
- Tendência sempre com texto, nunca apenas cor.
- Apêndice técnico progressivo.

### Analista de negócio

O relatório é tratado como produto de continuidade do cuidado e deve atender simultaneamente:
- paciente/família;
- cuidadores;
- fisioterapia, fonoaudiologia, nutrição, psicologia, enfermagem e TO;
- especialistas médicos.

Uma única fonte de dados deve alimentar:
- SOAP;
- síntese longitudinal;
- relatório de cuidado;
- tabela de medicamentos.

### Desenvolvedor

Entregas:
- extensão de `AgaReportModel` com resumo longitudinal e plano consolidado;
- agrupamento visual por dimensão;
- confirmação explícita de revisão clínica antes de imprimir/exportar;
- skill reutilizável de front-end clínico;
- CSS separado para relatório e impressão;
- testes de regressão do novo view model.

### QA

Cenários obrigatórios:
- paciente A nunca recebe dado de B;
- AGA inicial correta como baseline;
- mesma escala/mesma versão: comparável;
- versão diferente: não comparável;
- escala sem escore: sem invenção;
- problema resolvido permanece;
- alerta urgente permanece visível;
- relatório A4 com 1, 5 e 20+ escalas;
- ausência de dados;
- impressão com e sem apêndice;
- teclado e foco;
- snapshot com schema versionado.

### Product Owner

#### P0
- segurança para dados reais;
- baseline e longitudinalidade confiáveis;
- relatório revisável e rastreável;
- nenhuma alteração de regra clínica sem fonte/teste.

#### P1
- experiência elegante e rápida;
- plano multiprofissional consolidado;
- melhor visualização “o que mudou?”.

#### P2
- gráficos avançados;
- filtros por janela temporal;
- exportações adicionais.

## Gap crítico antes de declarar “dados reais liberados”

O repositório possui um `GO_LIVE_CHECKLIST.md` que exige evidência operacional de todos os P0. Ativação de domínio e disponibilidade do banco são necessárias, mas não são suficientes, isoladamente, para declarar go-live clínico.

Antes de ampliar uso real, registrar evidência de:
- HTTPS/APP_URL;
- autenticação e bloqueio de usuário não autorizado;
- RBAC;
- health check de banco;
- migrations;
- backup automático + restore testado;
- CI/test/typecheck/build;
- logs sem conteúdo clínico;
- teste AGA inicial -> retorno;
- teste de relatório, medicamentos e “O que mudou?”.

## Regra de produto

**Sugestão automática não é conduta confirmada.**

Enquanto o sistema não persistir aceite/rejeição/edição de cada recomendação, o relatório deve manter essas ações como “sugestões para revisão médica” e exigir confirmação humana antes de impressão/exportação.

## Próxima evolução de dados recomendada

Criar, em etapa posterior, uma entidade de recomendação revisada, por exemplo:

- `Recommendation`
- origem (escala/problema/manual)
- texto proposto
- texto final
- status: PROPOSED / ACCEPTED / EDITED / REJECTED
- revisor
- data
- consulta
- paciente

Isso permitirá distinguir tecnicamente:
- o que o sistema sugeriu;
- o que a médica aprovou;
- o que foi efetivamente compartilhado.

## Definition of Done

- [ ] golden masters verdes;
- [ ] typecheck verde;
- [ ] build verde;
- [ ] impressão A4 revisada;
- [ ] caso sintético com baseline + 2 retornos;
- [ ] nenhum dado real no Git;
- [ ] skill de design disponível ao Codex;
- [ ] PR revisado antes de merge;
- [ ] evidências P0 de go-live registradas.
