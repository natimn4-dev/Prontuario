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

## 2. Build e start

```bash
npm run typecheck
npm run build
npm start
```

O Better Auth também executa a validação de ambiente ao iniciar em produção e falha fechado se a configuração mínima estiver insegura.

## 3. Smoke pós-deploy

Com o domínio público apontando para a aplicação:

```bash
npm run release:clinical:smoke
```

Resultado esperado: `CLINICAL_RELEASE=SMOKE_OK`.

O smoke comprova:
- HTTPS acessível;
- `/api/health` HTTP 200 e banco `ok`;
- `/login` acessível;
- `/patients` e `/patients/new` não retornam conteúdo clínico para sessão anônima.

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
