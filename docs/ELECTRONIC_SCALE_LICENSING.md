# Licenciamento de escalas em formato eletrônico

Atualizado em 2026-08-19.

Este documento trata de **permissão de reprodução/uso eletrônico**, não de validade clínica. As engines de cálculo permanecem testadas e versionadas no domínio, mas o formulário web é fail-closed quando a permissão aplicável não foi confirmada.

## Instrumentos bloqueados por padrão

### MNA® completa
O site oficial da MNA informa que o instrumento pode ser incorporado ao prontuário eletrônico **com permissão** e em conformidade com copyright/marca. O formulário web permanece bloqueado enquanto `CLINICAL_LICENSE_MNA_EHR_CONFIRMED` não estiver explicitamente `true`.

### MEEM / MMSE®
A PAR informa que versões traduzidas/modificadas do MMSE exigem processo de permissão/licenciamento. A interface web do MEEM permanece bloqueada enquanto `CLINICAL_LICENSE_MMSE_ELECTRONIC_CONFIRMED` não estiver explicitamente `true`.

### MoCA®
Os termos/permissões oficiais do MoCA restringem reprodução/desenvolvimento eletrônico fora das modalidades autorizadas/licenciadas. A interface web permanece bloqueada enquanto `CLINICAL_LICENSE_MOCA_ELECTRONIC_CONFIRMED` não estiver explicitamente `true`.

## Regra operacional

1. Nunca definir uma flag como `true` apenas porque o instrumento é clinicamente útil ou está reproduzido em livro/artigo.
2. Guardar a evidência documental de autorização/licença fora do Git e dos logs da aplicação.
3. Somente depois da autorização aplicável, definir a flag correspondente no ambiente de produção e reiniciar a aplicação.
4. O endpoint server-side também verifica a licença. Não é suficiente esconder o formulário no React.
5. Avaliações históricas já persistidas não são apagadas/reclassificadas por este gate; a restrição controla **nova administração eletrônica**.

## Comportamento da interface

Quando uma licença não está confirmada:
- a definição completa do instrumento não é enviada ao navegador;
- não existe formulário aplicável para nova avaliação;
- tentativa direta de POST recebe `403 SCALE_LICENSE_REQUIRED`;
- a tela informa que a escala está clinicamente validada, mas aguarda licença/permissão eletrônica.

## Evidência de liberação

Antes de ativar uma flag em produção, registrar internamente:
- titular/licenciante;
- escopo da permissão (clínico, eletrônico/EHR/web, organização/usuários);
- versão/idioma autorizado;
- data e prazo de validade, quando aplicável;
- eventuais requisitos de certificação/treinamento.

A confirmação dessas permissões é uma etapa humana/jurídica e não pode ser inferida automaticamente pelo software.
