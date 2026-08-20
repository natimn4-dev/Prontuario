# Checklist de go-live

Nenhum dado real de paciente deve entrar no sistema antes de **todos os P0** abaixo estarem concluídos.

## P0 — Infraestrutura
- [ ] domínio final com HTTPS válido;
- [ ] `APP_URL` aponta para o domínio HTTPS real;
- [ ] banco MySQL de produção criado com usuário exclusivo e privilégio mínimo;
- [ ] migration Prisma aplicada e registrada;
- [ ] `prisma generate` executado na mesma versão do código;
- [ ] `/api/health` responde `200` com banco saudável e `releaseId` esperado;
- [ ] `/api/health/assets` confirma CSS/JS presentes no build e entregues publicamente com HTTP `200`;
- [ ] horário/timezone do servidor documentado e consistente.

## P0 — Autenticação
- [ ] Google OAuth criado para o projeto correto;
- [ ] callback autorizado exatamente em `/api/auth/callback/google`;
- [ ] `BETTER_AUTH_SECRET` aleatório, >=32 caracteres e exclusivo de produção;
- [ ] `AUTH_ALLOWED_EMAILS` contém somente profissionais autorizados;
- [ ] `AUTH_BOOTSTRAP_ADMIN_EMAILS` contém o administrador inicial e é subconjunto da allowlist;
- [ ] `/login` renderiza o fallback server-side para `/auth/google` mesmo sem JavaScript;
- [ ] `/auth/google` inicia redirecionamento HTTPS para `accounts.google.com`;
- [ ] usuário autorizado conclui login Google e acessa a área clínica;
- [ ] usuário não autorizado foi testado e bloqueado;
- [ ] usuário desativado perde acesso imediatamente;
- [ ] último administrador não pode ser removido.

## P0 — Banco e segurança clínica
- [ ] vínculo paciente ↔ consulta ↔ documento validado;
- [ ] consulta finalizada fica imutável;
- [ ] alertas urgentes bloqueiam finalização enquanto não revisados;
- [ ] documentos são versionados;
- [ ] auditoria não duplica texto clínico livre;
- [ ] nenhum dado real existe no Git/GitHub.

## P0 — Backup
- [ ] `mysqldump` e `mysql` disponíveis no host de execução;
- [ ] chave AES-256 de backup armazenada fora do repositório;
- [ ] backup automático agendado;
- [ ] cópia fora do servidor principal;
- [ ] restore realizado com sucesso em homologação;
- [ ] integridade pós-restore validada;
- [ ] responsável por recuperação definido.

## P0 — Aplicação
- [ ] `npm ci` concluído sem vulnerabilidade crítica não tratada;
- [ ] `npm test` verde;
- [ ] `npm run typecheck` verde;
- [ ] `npm run build` verde;
- [ ] `npm run release:clinical:smoke` retorna `CLINICAL_RELEASE=SMOKE_OK` após o deploy da `main`;
- [ ] smoke test em ambiente de homologação;
- [ ] teste AGA inicial → consulta subsequente;
- [ ] teste SOAP;
- [ ] teste relatório familiar A4;
- [ ] teste tabela de medicamentos;
- [ ] teste “O que mudou?”;
- [ ] teste com versão de escala não comparável.

## P0 — Privacidade e operação
- [ ] política de acesso interno aprovada;
- [ ] termo/política de privacidade aplicável ao serviço definida;
- [ ] responsável por incidentes definido;
- [ ] procedimento de desligamento de profissional testado;
- [ ] logs não contêm conteúdo clínico livre ou tokens;
- [ ] homologação utiliza somente dados sintéticos.

## P1 — Após go-live controlado
- [ ] monitoramento de erros e disponibilidade;
- [ ] teste de restauração periódico;
- [ ] revisão trimestral de usuários;
- [ ] atualização de dependências com CI;
- [ ] política de retenção/arquivamento formalizada;
- [ ] Content-Security-Policy com nonce validada no Next.js antes de ser habilitada.
