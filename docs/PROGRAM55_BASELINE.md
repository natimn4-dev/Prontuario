# Programa 55+ — Baseline de implementação

Data da auditoria: 2026-09-01

## Escopo

Baseline técnico antes da implementação do módulo **Programa 55+ — Saúde, Longevidade e Autonomia**, conforme regra de não regressão e arquitetura aditiva.

## Estado do repositório

- Repositório: `natimn4-dev/Prontuario`
- Branch de produção: `main`
- SHA auditado: `728fd8a85476e3552e2c61e82949ffc2cf41b782`
- Último commit: `Restaura acesso resiliente das três médicas (#168)`
- Branch de trabalho criada: `feat/programa-55`
- PR aberto observado: `#130 Diagnóstico: acesso em navegador real`
- O PR #130 declara explicitamente que é temporário, diagnóstico e não deve ser implantado; portanto fica fora do escopo desta feature.

## Evidência operacional conhecida do SHA

Foi identificado workflow de produção `Production Clinical Smoke` associado ao SHA `728fd8a8...` com conclusão `success` em 2026-09-01.

Também foi observado workflow `VIDaaS Diagnostic Probe` com conclusão `success` para o mesmo SHA.

A consulta de status combinado do commit não retornou statuses clássicos, portanto não deve ser usada isoladamente como prova de CI completo.

## Regras internas confirmadas

O `AGENTS.md` vigente determina, entre outras salvaguardas:

- segurança clínica, rastreabilidade e preservação de dados acima da velocidade de implementação;
- nunca misturar pacientes/consultas;
- nenhuma alteração de regra clínica sem fonte, revisão clínica e teste;
- não apagar histórico clínico;
- nenhuma regra clínica diretamente em React;
- toda saída compartilhável deve respeitar identidade e revisão;
- qualquer nova interface clínica deve aplicar `.agents/skills/frontend-clinical-design/SKILL.md`.

A skill de front-end clínico reforça o fluxo:

`dados persistidos -> domínio clínico testado -> view model -> componente de apresentação`

E exige longitudinalidade explícita, ausência de inferência clínica no componente, acessibilidade e impressão A4.

## Arquitetura existente relevante

Stack confirmada no `package.json`:

- Next.js 16.3.1
- React 19.2
- Node 22.x
- Prisma 7.7
- MySQL/MariaDB adapter
- Better Auth

Scripts de qualidade existentes que deverão integrar a validação do Programa 55+:

- `npm test`
- `npm run test:clinical`
- `npm run test:integration`
- `npm run validate:domain`
- `npm run validate:security`
- `npm run release:clinical:prestart`
- `npm run release:clinical:smoke`
- `npm run validate:repo`

O schema atual confirma:

- `UserRole`: `ADMIN`, `PHYSICIAN`, `READ_ONLY`;
- `ConsultationType`: `AGA_INITIAL`, `FOLLOW_UP`;
- `Patient.id` já é identidade canônica;
- relações longitudinais existentes de consultas, problemas, escalas, exames, medicamentos e documentos;
- `AuditEvent` já integra o modelo de auditoria;
- não há justificativa de baseline para criar cadastro paralelo de pacientes ou duplicar o motor de escalas.

## Diretriz arquitetural aprovada para continuação

O Programa 55+ será implementado como camada adicional vinculada a `Patient.id`, sem modificar a semântica clínica atual.

Princípio:

**UMA PESSOA -> UM PRONTUÁRIO -> MÚLTIPLAS LINHAS DE CUIDADO**

A estratégia preferencial permanece:

- feature flag `FEATURE_PROGRAM_55`;
- entidades Prisma aditivas para enrollment/checkpoints/dados profissionais/metas/composição corporal;
- associação opcional a consulta existente;
- nenhuma modificação de `ConsultationType` sem necessidade demonstrada;
- reutilização do motor de escalas existente;
- RBAC multiprofissional aditivo, sem ampliar privilégios atuais;
- nenhuma integração direta com Tera Science sem documentação oficial/API e autorização específica.

## Bloqueios de baseline nesta sessão

### Execução local

A tentativa de clonar o repositório para executar `build` e testes localmente falhou por indisponibilidade de resolução de rede do ambiente de execução (`Could not resolve host: github.com`).

Por isso, **não foi possível reproduzir localmente o build/test suite** nesta sessão.

### Hostinger

A skill oficial do Hostinger Connector foi carregada e revisada. Ela determina que operações do website Node.js usem `hostinger-hosting-mcp` e que o `username` real seja obtido por `hosting_listWebsitesV1`, nunca inferido.

Nesta sessão, porém, o namespace operacional `hosting_*` não foi disponibilizado ao agente; apenas a documentação/skill do plugin estava acessível. Portanto ainda não foi possível:

- listar websites;
- confirmar o username da conta;
- listar deployments Node.js;
- confirmar build/deployment ativo;
- inspecionar mecanismos de rollback/backup pelo conector;
- executar smoke test Hostinger diretamente.

Não foi usada API paralela, shell ou workaround para contornar esse bloqueio, conforme regra do próprio plugin Hostinger.

## Gate antes de migration/runtime code

Antes de qualquer migration ou alteração que afete runtime, concluir:

1. executar a suíte de baseline em ambiente capaz de instalar dependências;
2. confirmar workflow CI/build completo do SHA atual;
3. obter leitura Hostinger por `hosting_listWebsitesV1`;
4. registrar username real, website exato e deployment atual;
5. confirmar mecanismo de rollback/backup;
6. manter `FEATURE_PROGRAM_55=false` por padrão;
7. somente então iniciar a Fase 1 de schema/API/feature flag.

## Não regressão

Nenhum arquivo clínico, escala, autenticação, SOAP, medicamento, vacina, gráfico, relatório ou regra de acesso foi alterado por esta auditoria.

`main` permanece intocado.
