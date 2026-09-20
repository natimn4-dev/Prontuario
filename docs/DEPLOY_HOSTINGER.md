# Deploy na Hostinger

## Pré-requisitos
- plano Hostinger com suporte a Node.js Web App;
- repositório GitHub contendo o projeto;
- domínio configurado;
- banco MySQL criado;
- credenciais Google OAuth;
- secrets de produção.

## 1. Banco
No hPanel, criar um banco MySQL exclusivo para o prontuário e um usuário com senha forte.

Configurar:
```env
DATABASE_URL=mysql://USUARIO:SENHA@HOST:3306/BANCO
```

Não salvar esse valor no Git.

## 2. Variáveis de ambiente
Configurar no painel de deploy:
- `NODE_ENV=production`
- `APP_URL=https://prontuario.nataliamendesgeriatra.com`
- `DATABASE_URL=...`
- `BETTER_AUTH_SECRET=...`
- `GOOGLE_CLIENT_ID=...`
- `GOOGLE_CLIENT_SECRET=...`
- `AUTH_ALLOWED_EMAILS=...`
- `AUTH_BOOTSTRAP_ADMIN_EMAILS=...`
- `USDA_FDC_API_KEY=<chave privada opcional para o fallback USDA FoodData Central>`

Mudança de variável deve ser seguida de redeploy.

## 3. Google OAuth
Registrar como URI de callback de produção:

`https://prontuario.nataliamendesgeriatra.com/api/auth/callback/google`

## 4. Migration
Antes de liberar acesso clínico:
```bash
npm install
npm run prisma:generate
npx prisma migrate deploy
npm test
npm run typecheck
npm run build
```

A migration deve ser aplicada sobre backup válido e testado.

## 5. Deploy
Preferência: integração GitHub da Hostinger, para ter histórico reproduzível de versões.

O `package.json` contém:
- `build: next build`
- `start: next start`

## 6. Smoke test de homologação
Com dados sintéticos:
1. login autorizado;
2. login não autorizado recusado;
3. criação de paciente sintético;
4. AGA inicial;
5. consulta subsequente;
6. evolução “O que mudou?”;
7. SOAP;
8. relatório familiar;
9. tabela de medicamentos;
10. finalização e imutabilidade;
11. desativação de usuário e revogação de sessão;
12. `/api/health`.

## 7. Backup
Executar e validar `docs/BACKUP_RESTORE.md` antes do primeiro paciente real.

## 8. Go-live
Somente após preencher todos os itens P0 de `docs/GO_LIVE_CHECKLIST.md`.
