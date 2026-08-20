# Diagnóstico público seguro de prontidão do OAuth

## Contexto
O fluxo de login Google está no caminho canônico do Better Auth, mas falhas de produção ainda podem decorrer de configuração incompleta do ambiente. O health geral confirma banco, porém não informa se a configuração mínima de autenticação está presente.

## Mudança
Foi criado `GET /api/health/auth`, público apenas no caminho exato e sem cache. O endpoint retorna exclusivamente estado agregado (`ready`/`incomplete`) e verificações booleanas sobre:

- APP_URL com HTTPS;
- BETTER_AUTH_SECRET configurado com comprimento mínimo;
- GOOGLE_CLIENT_ID com formato padrão do Google;
- GOOGLE_CLIENT_SECRET configurado;
- allowlist de usuários configurada;
- administrador bootstrap configurado.

Nenhum valor, e-mail, segredo, token ou identificador de paciente é retornado.

## Segurança
- o endpoint não autentica nem cria sessão;
- não relaxa state, PKCE ou CSRF;
- não amplia acesso a rotas clínicas;
- subrotas de `/api/health/auth` continuam protegidas;
- nenhuma regra clínica ou dado de paciente foi alterado.

## Uso operacional
Após implantação, o endpoint permite distinguir rapidamente falha de configuração do OAuth de falha do provedor/callback sem solicitar captura de segredos do ambiente.
