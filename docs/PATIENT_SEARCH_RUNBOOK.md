# Busca de pacientes — runbook de produção

## Objetivo

A busca da página inicial é parte do fluxo clínico crítico. Paciente já cadastrado deve ser localizado sem novo cadastro, preservando integralmente as salvaguardas de identidade, homônimos, identificadores fortes, fingerprint e auditoria.

## Contrato funcional

- entrada: nome completo ou parte inicial de qualquer termo do nome;
- comparação canônica: ignora caixa, acentos e espaços repetidos;
- termos podem estar em ordem diferente;
- validação final é feita na aplicação a partir de `Patient.fullName`;
- `Patient.normalizedFullName` é índice auxiliar derivado, nunca fonte de verdade de identidade;
- `DRAFT` ou `IN_REVIEW` retorna `destinationPath` da consulta ativa;
- sem consulta ativa retorna `destinationPath` do paciente;
- resposta contém somente identidade mínima de seleção;
- `401`, `403`, `400` e `500` nunca são apresentados como “Nenhum paciente encontrado”.

O fallback para dados legados é paginado pela chave primária e limitado a 20 páginas de 100 registros. A correção permanente é manter `normalizedFullName` consistente; o fallback não deve evoluir para scan completo ilimitado.

## Auditoria segura do banco

Executar no ambiente que aponta para o banco correto:

```bash
npm run audit:patient-search-index
```

A saída é exclusivamente agregada e mostra:

- total de pacientes;
- quantidade com `normalizedFullName` nulo;
- quantidade com `normalizedFullName` vazio;
- quantidade cuja normalização armazenada diverge da função canônica atual;
- collation do banco, `Patient.fullName` e `Patient.normalizedFullName`.

Nunca registrar nomes, datas de nascimento, identificadores, termos pesquisados ou outros dados identificáveis em logs operacionais.

## Backfill idempotente

Se a auditoria encontrar divergências:

```bash
npm run backfill:patient-search-index
```

Antes de alterar qualquer linha, o comando executa `scripts/backup-mysql.mjs`. Se o backup criptografado falhar, o backfill não começa.

O backfill altera **somente** `Patient.normalizedFullName`. Ele não modifica:

- `fullName`;
- `identityFingerprint`;
- `homonymDiscriminator`;
- `needsIdentityReview`;
- identificadores;
- consultas ou dados clínicos.

Depois da alteração, o comando repete a auditoria. Execuções subsequentes sem divergências não produzem mudanças.

## Release gate

`npm run release:clinical:prestart` bloqueia a liberação quando:

- existem migrations incompletas;
- a conexão de produção está inválida;
- ferramentas/chave de backup não estão disponíveis;
- existe `normalizedFullName` nulo, vazio ou divergente;
- as colunas de nome não possuem collation `utf8mb4` verificável.

O gate só imprime contagens e metadados de schema, sem PHI.

## Teste MySQL obrigatório

O CI executa `npm run test:integration` contra MySQL 8.4 efêmero. `tests/integration/patient-search-mysql.test.ts` cria apenas dados sintéticos e valida:

- `Maria Clara Andrade`;
- `maria clara`;
- `MARIA`;
- `Maria Andrade`;
- `Andrade Maria`;
- `  Maria   Clara  `;
- `Ávila`;
- `Avila`;
- `jose avila`;
- controle negativo `Mariana`;
- paciente legado com `normalizedFullName` inconsistente;
- consulta ativa e `destinationPath`;
- collations das colunas no MySQL real.

## Smoke autenticado em produção

Usar exclusivamente paciente sintético/de teste autorizado. Não usar nome real de paciente em logs ou parâmetros de workflow públicos.

Variáveis necessárias:

- `APP_URL=https://prontuario.nataliamendesgeriatra.com`;
- `PATIENT_SEARCH_SMOKE_COOKIE` — cookie de uma sessão autorizada, fornecido por canal secreto;
- `PATIENT_SEARCH_SMOKE_QUERY` — consulta do paciente sintético;
- `PATIENT_SEARCH_SMOKE_EXPECT_PATIENT_ID` — ID do paciente sintético esperado.

Executar:

```bash
npm run release:patient-search:smoke
```

O smoke confirma:

- busca autenticada HTTP 200;
- paciente sintético esperado presente;
- `destinationPath` para paciente ou consulta ativa;
- `Cache-Control: private, no-store, max-age=0`;
- ausência de campos identificáveis fora do contrato mínimo;
- `Mariana` não retorna falsamente o paciente sintético;
- busca inválida retorna `400`;
- busca sem sessão retorna `401`.

A saída do smoke não imprime nome, consulta pesquisada, cookie ou payload clínico.

## Pós-deploy Hostinger

1. Confirmar deployment do SHA esperado e `CLINICAL_RELEASE=PRESTART_OK`.
2. Confirmar `/api/health` com o `releaseId` esperado.
3. Se houver cache/CDN de aplicação, limpar somente depois de deployment saudável.
4. Executar o smoke clínico geral.
5. Executar o smoke autenticado de busca acima.
6. Na interface, confirmar que erro de sessão/permissão/servidor aparece como erro e não como ausência de paciente.
7. Não declarar o bug encerrado sem o smoke autenticado em produção.
