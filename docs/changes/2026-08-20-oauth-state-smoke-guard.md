# OAuth bootstrap smoke guard — 2026-08-20

## Contexto

Produção apresentou `state_mismatch` no retorno do Google OAuth. O smoke anterior confirmava que o endpoint canônico do Better Auth retornava uma URL do Google, mas não verificava se o bootstrap continha o parâmetro `state` nem se a resposta devolvia `Set-Cookie` ao navegador.

No Better Auth com banco configurado, o estado OAuth padrão depende de correlação entre o `state` enviado ao provedor e o cookie assinado usado no callback. Um bootstrap que alcance `accounts.google.com` sem esses elementos pode parecer saudável e ainda falhar no retorno.

## Mudança

`release:clinical:smoke` agora também:

- exige `/api/health/auth` com `status=ready`;
- exige parâmetro `state` na URL de autorização Google;
- exige pelo menos um `Set-Cookie` na resposta de `/api/auth/sign-in/social`;
- mantém a validação de origem HTTPS `accounts.google.com`, assets públicos e rotas clínicas protegidas.

A regra de validação foi isolada em `src/domain/oauth-bootstrap-smoke.ts` e recebeu golden masters para bootstrap válido, ausência de state, ausência de cookie e origem OAuth inválida.

## Segurança

- nenhuma verificação de OAuth, state, PKCE ou CSRF foi desabilitada;
- nenhum segredo, cookie ou token é persistido pelo smoke;
- nenhum dado clínico é lido ou modificado;
- o smoke continua sendo um gate técnico e não substitui o teste humano com conta autorizada e conta não autorizada.
