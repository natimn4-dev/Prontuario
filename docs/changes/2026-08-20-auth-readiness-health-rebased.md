# Diagnóstico público seguro de prontidão do OAuth

## Contexto
O login Google usa o fluxo canônico do Better Auth. Para diagnosticar produção sem solicitar capturas de segredos, faltava distinguir configuração OAuth incompleta de falha posterior no provedor/callback.

## Mudança
Foi criado `GET /api/health/auth`, público apenas no caminho exato e com `Cache-Control: no-store`. O endpoint retorna somente `ready`/`incomplete` e verificações booleanas.

A checagem reutiliza as mesmas regras centrais de ambiente já usadas no gate de produção: origem HTTPS canônica, sem loopback, credenciais embutidas, caminho, query ou fragmento; Client ID Google no formato esperado; segredo Better Auth mínimo e não-placeholder; segredo Google não-placeholder; allowlist configurada; administrador bootstrap configurado e contido na allowlist.

Nenhum valor de segredo, e-mail, token, cookie ou identificador de paciente é retornado.

## Segurança
- não autentica nem cria sessão;
- não desabilita `state`, PKCE ou CSRF;
- nenhuma rota clínica foi tornada pública;
- subrotas de `/api/health/auth` continuam protegidas;
- nenhuma regra clínica ou dado de paciente foi alterado.

## Uso operacional
Após implantação, `status: incomplete` indica que o ambiente precisa ser corrigido antes de investigar callback/provedor. `status: ready` confirma apenas a prontidão estática da configuração; não substitui o teste humano de login autorizado e bloqueio de conta não autorizada.
