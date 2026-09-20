# Runbook de liberação para uso clínico

Este documento transforma o `GO_LIVE_CHECKLIST.md` em gates executáveis. **CI verde não autoriza, isoladamente, o uso de dados reais.**

## 1. Pré-start no host de produção

Depois de configurar as variáveis de ambiente e instalar dependências:

```bash
npm run prisma:generate
npx prisma migrate deploy
npm run release:clinical:prestart
```

O comando somente libera `CLINICAL_RELEASE=PRESTART_OK` quando comprova:
- `NODE_ENV=production`;
- `APP_URL` válida e HTTPS;
- `DATABASE_URL` MySQL;
- `BETTER_AUTH_SECRET` não placeholder e >= 32 caracteres;
- Google OAuth configurado;
- allowlist não vazia e administrador bootstrap dentro dela;
- chave AES-256 de backup presente;
- `mysqldump` disponível;
- banco acessível;
- ausência de migration Prisma incompleta.

O comando não imprime valores de segredos.

### Hostinger Node.js gerenciado

Na hospedagem Node.js gerenciada da Hostinger, comandos `npm` do aplicativo são executados pelo pipeline de build e não devem ser tratados como um gate manual via SSH. O script padrão `build` do projeto é deliberadamente fail-closed e executa, nessa ordem:
1. `prisma generate`;
2. `prisma migrate deploy`;
3. `npm run release:clinical:prestart`;
4. `next build --webpack`.

O script `release:hostinger:build` delega ao mesmo `build` guardado. Portanto, a configuração já existente da Hostinger com Build command `build` ou com o alias `release:hostinger:build` usa o mesmo gate e não precisa ser trocada apenas por nomenclatura.

O deployment só é elegível para promoção quando os logs do build mostram `CLINICAL_RELEASE=PRESTART_OK`. Se o prestart falhar, o build deve falhar fechado e a release permanece bloqueada.

## 2. Build e start

Em ambientes onde os comandos são executados manualmente:

```bash
npm run typecheck
npm run build
npm start
```

Na Hostinger, o próprio `npm run build` já inclui o `PRESTART` formal descrito acima.

O Better Auth também executa a validação de ambiente ao iniciar em produção e falha fechado se a configuração mínima estiver insegura.

### Observabilidade de performance

Para uma janela controlada de medição, habilite `CLINICAL_PERFORMANCE_LOGGING=1`.
As rotas clínicas instrumentadas emitem somente JSON operacional com `requestId`,
rota, duração, contagem aproximada de operações Prisma, duração do banco,
transações e resultado HTTP. Não são emitidos SQL, parâmetros, nomes, IDs de
paciente ou texto clínico. Desabilite a variável após a janela de medição se o
monitoramento central já não precisar desses eventos.

`DATABASE_CONNECTION_LIMIT` controla o pool MariaDB por ambiente. O padrão é 5
e o código aceita somente valores inteiros de 1 a 10; não aumente o valor em
produção sem confirmar o limite do banco e observar saturação.

## 3. Smoke pós-deploy

Com o domínio público apontando para a aplicação:

```bash
npm run release:clinical:smoke
```

Resultado esperado: `CLINICAL_RELEASE=SMOKE_OK`.

O smoke comprova:
- HTTPS acessível;
- `/api/health` HTTP 200, banco `ok` e `releaseId` correspondente ao código que está sendo validado;
- CSS e JavaScript do build entregues publicamente;
- `/api/health/auth` pronto;
- `/login` acessível;
- bootstrap do Google OAuth com `state` e cookie de correlação;
- `/patients` e `/patients/new` não retornam conteúdo clínico para sessão anônima.

Todos os requests do smoke possuem timeout explícito e falham fechados em erro de DNS, TLS ou rede.

### Associação CI → release → produção

Quando `Production Clinical Smoke` é disparado pela conclusão da CI da `main`, o workflow deve fazer checkout de `github.event.workflow_run.head_sha`, e não do `main` que existir alguns segundos depois. Assim, o `CLINICAL_RELEASE_ID` usado pelo smoke pertence ao mesmo commit cuja CI foi aprovada.

O workflow pode aguardar o redeploy automático da Hostinger por aproximadamente 15 minutos. Cada tentativa continua exigindo o mesmo `releaseId`; ele não aceita silenciosamente uma versão anterior nem muda o alvo quando outro merge entra em `main`.

## 4. Backup operacional obrigatório

O pré-start comprova ferramenta e chave, mas não substitui o teste operacional. Antes do primeiro paciente real:

```bash
node scripts/backup-mysql.mjs
```

A cópia criptografada e o manifesto devem ser enviados para armazenamento fora do servidor. Execute restauração em ambiente de teste conforme `docs/BACKUP_RESTORE.md` e registre responsável, data e resultado.

## 5. OAuth e usuários

No Google Cloud, o callback deve ser exatamente:

`https://prontuario.nataliamendesgeriatra.com/api/auth/callback/google`

Teste com:
1. uma conta autorizada;
2. uma conta fora da allowlist, que deve ser rejeitada;
3. um usuário desativado, que não pode criar nova sessão.

Nunca registrar client secret ou tokens em documentação, issues, logs ou screenshots.

## 6. Smoke clínico sintético

Antes de dado real, usar apenas paciente sintético para comprovar:
- cadastro e identidade/homônimo;
- AGA inicial e consulta subsequente;
- problemas clínicos e geriátricos longitudinais;
- reconciliação de medicamentos e horários;
- SOAP e único botão de copiar;
- Katz, Lawton e GDS-15 nas versões Freitas/Py liberadas;
- ECOG/CRASH quando clinicamente aplicáveis;
- relatório A4, revisão médica e bloqueio de compartilhamento antes da revisão;
- finalização e imutabilidade da consulta;
- comparação longitudinal sem unir versões incompatíveis.

## 7. Critério final

Somente marcar o ambiente como **LIBERADO PARA USO CLÍNICO** quando, na mesma release:
- CI da `main` estiver verde;
- `release:clinical:prestart` retornar `PRESTART_OK` no host;
- `release:clinical:smoke` retornar `SMOKE_OK` contra o domínio;
- backup + restore de teste estiverem documentados;
- OAuth/allowlist tiverem sido validados;
- smoke clínico sintético tiver sido concluído.

Se qualquer item falhar, o ambiente permanece **BLOQUEADO PARA DADOS REAIS**.
