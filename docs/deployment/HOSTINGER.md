# Hostinger — integração GitHub e go-live clínico

## Objetivo

Publicar `natimn4-dev/Prontuario` como aplicação Next.js/Node.js gerenciada pela Hostinger, usando a branch `main`, sem armazenar segredos no Git e sem liberar dados reais antes dos gates clínicos.

## Configuração no hPanel

1. Acesse **Websites → Add website → Node.js Web App / Deploy Web App**.
2. Escolha **Import Git Repository / Connect with GitHub**.
3. Autorize o aplicativo Hostinger no GitHub e selecione o repositório `natimn4-dev/Prontuario`.
4. Selecione a branch `main`.
5. Vincule o domínio `prontuario.nataliamendesgeriatra.com`.
6. Use:
   - Framework: **Next.js**
   - Node.js: **22.x**
   - Package manager: **npm**
   - Build command canônico: `npm run build`
   - Alias equivalente, se já configurado: `npm run release:hostinger:build`
   - Start command: `npm start`
7. Ative redeploy automático da branch `main`, se disponível no plano.

Não é necessário trocar uma configuração existente entre os dois comandos de build acima: `release:hostinger:build` delega ao mesmo `npm run build`. O build guardado executa `prisma generate`, `prisma migrate deploy`, o gate `release:clinical:prestart` e somente depois `next build --webpack`. Se migration ou prestart falhar, o deploy deve falhar em vez de publicar aplicação e banco fora de sincronia.

## Variáveis de ambiente obrigatórias no hPanel

Nunca copie valores reais para arquivos versionados.

- `NODE_ENV=production`
- `APP_URL=https://prontuario.nataliamendesgeriatra.com`
- `DATABASE_URL=<URL MySQL/MariaDB de produção>`
- `BETTER_AUTH_SECRET=<segredo aleatório forte, exclusivo de produção>`
- `GOOGLE_CLIENT_ID=<OAuth Client ID Web>`
- `GOOGLE_CLIENT_SECRET=<OAuth Client Secret>`
- `AUTH_ALLOWED_EMAILS=<lista fechada de e-mails autorizados>`
- `AUTH_BOOTSTRAP_ADMIN_EMAILS=<subconjunto da allowlist>`
- `BACKUP_ENCRYPTION_KEY_B64=<32 bytes aleatórios codificados em base64>`
- `CLINICAL_LICENSE_MNA_EHR_CONFIRMED=false`
- `CLINICAL_LICENSE_MMSE_ELECTRONIC_CONFIRMED=false`
- `CLINICAL_LICENSE_MOCA_ELECTRONIC_CONFIRMED=false`

`MYSQLDUMP_BIN` é opcional quando `mysqldump` já estiver no PATH. Se o ambiente gerenciado não disponibilizar `mysqldump`, o gate de backup precisa ser resolvido por um mecanismo de backup/restauração equivalente antes do uso com pacientes reais; não remova silenciosamente esse requisito.

As três flags de licença devem permanecer `false` até existir evidência documental da autorização aplicável para reprodução/administração eletrônica de cada instrumento.

## Google OAuth

O Better Auth usa `APP_URL` como `baseURL`. No Google Cloud Console, o OAuth Client ID do tipo Web Application deve ter como Authorized redirect URI:

`https://prontuario.nataliamendesgeriatra.com/api/auth/callback/google`

Para desenvolvimento local, pode ser mantido também:

`http://localhost:3000/api/auth/callback/google`

Não use OAuth `org_internal` se o acesso precisar incluir contas Google externas à organização. O próprio prontuário já aplica uma allowlist de e-mails após o retorno do Google.

## Banco e migrations

A aplicação usa Prisma com MySQL/MariaDB. O deploy da Hostinger deve receber uma `DATABASE_URL` com permissões suficientes para ler/escrever o schema da aplicação e aplicar migrations versionadas, sem usar credenciais root quando não forem necessárias.

O build de produção executa:

`prisma migrate deploy`

Não use `prisma migrate dev` no servidor de produção.

## Verificação pós-deploy

O endpoint público de health check deve responder HTTP 200 e incluir:

- `status: "ok"`
- `database: "ok"`
- `releaseId: "2026-08-26-approved-capacity-chart-v1"`

Nesta release, os escores numéricos discretos das escalas complementares são apresentados como listas de seleção. MEEM, MoCA e ISI preservam o modo rápido score-only; medidas físicas contínuas preservam o valor bruto necessário ao acompanhamento longitudinal.

O `releaseId` é deliberadamente servido com `Cache-Control: no-store`; uma CDN ou proxy não deve reutilizar um identificador antigo para declarar a implantação como atual. O smoke também exige esse header antes de aceitar a resposta de health.

Em seguida execute:

`npm run release:clinical:smoke`

Resultado esperado:

`CLINICAL_RELEASE=SMOKE_OK`

O smoke verifica HTTPS, health/banco, entrega dos assets Next.js, prontidão do OAuth, início seguro do fluxo Google e bloqueio anônimo das rotas clínicas. No GitHub Actions, quando disparado pela conclusão da CI da `main`, ele faz checkout do **SHA exato que disparou aquela CI** e compara a produção contra o `releaseId` desse mesmo código. Isso impede que merges subsequentes façam o smoke validar acidentalmente outra release.

O workflow aguarda o redeploy por até aproximadamente 15 minutos antes de falhar fechado, acomodando o tempo de build/promoção da Hostinger sem transformar atraso de publicação em falso diagnóstico de regressão.

## Gate clínico antes de dados reais

Antes do primeiro paciente real:

1. `npm run release:clinical:prestart` deve retornar `CLINICAL_RELEASE=PRESTART_OK`.
2. Backup criptografado real deve ser gerado e restaurado com sucesso em banco isolado.
3. Deve existir uma cópia de backup fora do mesmo ambiente da aplicação.
4. Google OAuth deve ser testado com uma conta autorizada e uma não autorizada.
5. Executar fluxo completo apenas com paciente sintético: cadastro → consulta → escalas → problemas → medicamentos → SOAP → relatório → revisão/finalização → histórico.
6. Somente depois liberar dados reais.

## Automação esperada

Após a primeira conexão Hostinger ↔ GitHub, pushes futuros em `main` podem disparar redeploy automático conforme a configuração/plano da Hostinger. O GitHub mantém CI e `Production Clinical Smoke`; o health check com `releaseId` e o checkout do SHA exato evitam considerar uma versão antiga — ou uma versão diferente — como implantação bem-sucedida.

## Rollback

Se um deploy novo falhar:

1. Não aplique migrations manuais improvisadas.
2. Consulte o log de deployment do hPanel.
3. Reverta a aplicação para o último commit conhecido como estável somente após avaliar compatibilidade do schema.
4. Nunca restaure banco de produção sem snapshot/backup e plano explícito de recuperação.
