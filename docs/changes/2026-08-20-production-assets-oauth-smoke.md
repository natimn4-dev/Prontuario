# Gate automático de assets e início do OAuth em produção

## Contexto

O endpoint `/api/health` pode permanecer saudável mesmo quando a página de login chega sem CSS/JavaScript ou quando o início do Google OAuth está quebrado. Esse cenário foi observado durante a validação de produção e não deve voltar a passar silenciosamente pelo smoke test.

## Mudança

O `release:clinical:smoke` passa a exigir, além do health e da proteção das rotas clínicas:

- `/api/health/assets` com CSS e JavaScript presentes no build;
- entrega pública de um asset CSS e um asset JavaScript com HTTP `200`;
- `/login` contendo o fallback server-side `href="/auth/google"`;
- `/auth/google` iniciando redirecionamento HTTPS para `accounts.google.com`;
- `/patients` e `/patients/new` permanecendo inacessíveis anonimamente.

## Segurança

O smoke continua sem credenciais, cookies, dados de pacientes ou login real. Ele valida somente o perímetro público necessário para bootstrap da autenticação e a proteção das rotas clínicas.

O teste não considera o OAuth humano concluído: login de conta autorizada, bloqueio de conta não autorizada e revogação de usuário continuam gates manuais antes do uso com dados reais.

## Resultado esperado

Depois de deploy da `main`, o workflow `Production Clinical Smoke` só retorna `CLINICAL_RELEASE=SMOKE_OK` quando health, assets, login server-side, início do Google OAuth e proteção anônima estiverem simultaneamente operacionais.
