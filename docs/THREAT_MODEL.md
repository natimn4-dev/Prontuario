# Threat model — MVP clínico

## Ativos protegidos
- identificação do paciente;
- conteúdo de consultas;
- escalas e evolução longitudinal;
- lista de problemas;
- medicamentos;
- SOAP e relatórios;
- credenciais/sessões;
- trilha de auditoria;
- backups.

## Ameaças prioritárias

### 1. Mistura de pacientes
**Risco:** documento ou escala de A gravada em B.

**Controles:**
- paciente é derivado da consulta carregada no banco;
- servidor não aceita `patientId` do navegador para criar escala/documento ou finalizar consulta;
- medicamento precisa pertencer ao mesmo paciente da consulta;
- testes de contexto clínico;
- consulta finalizada é imutável.

### 2. Acesso não autorizado
**Controles:**
- Google OAuth;
- allowlist fechada;
- usuário ativo/inativo;
- RBAC;
- revogação de sessão;
- último ADMIN protegido.

### 3. Roubo/reuso de sessão
**Controles:**
- cookie seguro em produção;
- sessão de 8h;
- cookie cache desabilitado;
- gestão administrativa exige sessão recente;
- mudança de privilégio revoga sessões.

### 4. Account takeover por linking
**Controle:** account linking desabilitado no MVP.

### 5. Vazamento de token OAuth
**Controle:** criptografia de tokens OAuth habilitada no Better Auth; tokens nunca devem entrar em logs.

### 6. XSS em relatório/documento
**Controles:**
- renderização primária em texto;
- escaping obrigatório para HTML;
- testes contra tags/atributos maliciosos;
- proibição de `dangerouslySetInnerHTML` sem revisão específica.

### 7. Exposição por Git
**Controles:**
- repositório somente para código;
- `.gitignore` para exports/backups/bancos;
- varredura CI por arquivos proibidos e padrões de segredo.

### 8. Perda/corrupção do banco
**Controles:**
- backup comprimido e AES-256-GCM;
- checksum SHA-256;
- cópia externa;
- restore testado;
- backup antes de migrations relevantes.

### 9. Alteração concorrente ou bypass na finalização
**Risco:** o navegador tentar finalizar uma consulta com estado desatualizado, paciente divergente ou ocultando alertas urgentes existentes.

**Controles:**
- `patientId` é derivado da consulta no servidor e não é aceito no comando HTTP;
- alertas urgentes atuais são recalculados no servidor a partir das avaliações da própria consulta;
- reaplicações usam apenas o registro efetivo mais recente de cada instrumento;
- o cliente pode apenas reconhecer explicitamente códigos de alertas que o servidor informou; códigos obsoletos/inventados não satisfazem alertas atuais ausentes da lista;
- update atômico condicionado a `status=IN_REVIEW`; se outra operação mudar a consulta, a finalização falha;
- confirmação de revisão clínica é obrigatória;
- início de revisão e finalização exigem permissão `consultation.finalize`;
- auditoria registra apenas ação/outcome/reasonCode operacional, sem texto clínico dos alertas.

### 10. Auditoria virando segundo prontuário
**Controle:** auditoria registra ator, entidade, ação, outcome e códigos operacionais; não duplica texto clínico livre.

### 11. Cadastro concorrente do mesmo paciente
**Risco:** duas requisições simultâneas tentarem criar o mesmo paciente ou o mesmo identificador forte.

**Controles:**
- unicidade no banco para fingerprint padrão de identidade e identificadores normalizados;
- transação serializável no fluxo de criação;
- conflito `P2002` é tratado como tentativa bloqueada, não como autorização para criar um segundo cadastro;
- após conflito concorrente, os candidatos são reavaliados pela mesma regra de domínio usada no caminho normal;
- identificador forte tem precedência sobre coincidência por nome/data;
- tentativa bloqueada por corrida também gera evento `patient.create.blocked_duplicate`, sem copiar conteúdo clínico para a auditoria.

## Riscos residuais antes do go-live
- dependências ainda precisam ser instaladas e auditadas em ambiente conectado;
- schema Prisma precisa ser validado pela CLI da versão instalada;
- Google OAuth precisa ser testado com credenciais reais;
- impressão A4 precisa de homologação humana;
- CSP com nonce precisa ser testada antes de habilitar;
- restore precisa ser testado contra MySQL real de homologação.
