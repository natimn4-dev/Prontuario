# Autenticação e autorização

## Decisão
A produção utiliza **Google OAuth** por Better Auth. Não existe cadastro público e não existe senha local no prontuário.

O acesso pode decorrer de:
- identidades legadas explicitamente aprovadas no contrato fechado de produção;
- pré-autorização persistida em `UserAccessGrant` para novos profissionais;
- bootstrap administrativo controlado por `AUTH_BOOTSTRAP_ADMIN_EMAILS`.

## Fluxo
1. usuário escolhe “Continuar com Google”;
2. `/auth/google` inicia o Better Auth no servidor, preserva `state`/PKCE em cookie e redireciona diretamente para `accounts.google.com`;
3. se um navegador interno bloquear o fluxo, `/auth/google?manual=1` oferece continuação por gesto explícito e abertura em nova janela;
4. Google autentica a identidade;
5. Better Auth processa o callback;
6. antes de criar o usuário, a aplicação verifica o contrato de acesso vigente;
7. usuário sem autorização é recusado;
8. a cada nova sessão, a aplicação verifica novamente se o usuário está ativo e autorizado;
9. endpoints clínicos consultam o usuário no banco antes de autorizar a ação;
10. falhas OAuth são direcionadas a `/auth/error`, que apresenta um código diagnóstico seguro sem expor senha, token ou dado clínico.

## Diagnóstico do login
A tela `/auth/error` traduz falhas do provedor para códigos operacionais estáveis, entre eles:

- `OAUTH_START_FAILED`: não foi possível iniciar o OAuth;
- `OAUTH_CALLBACK_STATE_FAILED`: o retorno do Google perdeu ou não validou `state`/callback;
- `GOOGLE_ACCOUNT_ASSOCIATION_FAILED`: falha ao associar a identidade Google ao acesso existente;
- `USER_ACCESS_SETUP_FAILED`: falha ao habilitar/criar o usuário autorizado;
- `SESSION_CREATION_FAILED`: Google autenticou, mas a sessão local não foi criada;
- `GOOGLE_IDENTITY_FAILED`: não foi possível obter identidade Google utilizável;
- `AUTHENTICATION_FAILED`: falha não classificada.

Os códigos são deliberadamente não sensíveis. Eles servem para orientar suporte sem revelar se uma identidade específica existe no banco, sem expor tokens e sem expor dados clínicos.

## RBAC
### ADMIN
- leitura e escrita clínica;
- finalização de consulta;
- geração de documentos;
- gestão de usuários;
- consulta de auditoria operacional.

### PHYSICIAN
- leitura e escrita clínica;
- finalização de consulta;
- geração de documentos;
- sem gestão de usuários.

### READ_ONLY
- somente leitura de pacientes autorizados;
- sem alteração de consulta/documento/usuário.

## Sessão
- validade máxima configurada: 8 horas;
- refresh: 30 minutos;
- cookie cache desativado para não atrasar revogação;
- cookies seguros em produção;
- gestão de usuários exige autenticação recente (10 minutos);
- mudança de papel ou desativação revoga todas as sessões daquele usuário.

## OAuth
- tokens de acesso/refresh são armazenados com criptografia habilitada pelo Better Auth;
- account linking está desabilitado;
- somente o provedor Google está habilitado no MVP;
- scopes adicionais não devem ser solicitados sem necessidade clínica/operacional documentada;
- o caminho padrão usa redirecionamento HTTP direto após criação segura de `state`/PKCE;
- o modo compatível preserva o mesmo destino Google validado, exigindo gesto explícito do usuário.

## Google Cloud
Configurar exatamente os redirects dos ambientes usados. Exemplo de produção:

`https://prontuario.nataliamendesgeriatra.com/api/auth/callback/google`

Não usar wildcard para callback.

## Primeiro administrador
`AUTH_BOOTSTRAP_ADMIN_EMAILS` precisa ser subconjunto de `AUTH_ALLOWED_EMAILS`.

Depois do primeiro login, a gestão de usuários deve ser feita pelo fluxo administrativo. A aplicação impede desativar/rebaixar o último administrador ativo.

## Remoção de acesso
1. desativar usuário;
2. desativar/remover a autorização persistida correspondente quando aplicável;
3. revogar sessões;
4. registrar evento de auditoria;
5. se necessário, revogar o aplicativo no provedor Google.
