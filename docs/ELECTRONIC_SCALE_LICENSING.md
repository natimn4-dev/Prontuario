# Licenciamento de escalas em formato eletrônico

Atualizado em 2026-08-21.

Este documento trata de **permissão de reprodução/uso eletrônico**, não de validade clínica. Quando o aplicativo reproduz um instrumento protegido, o formulário web permanece fail-closed enquanto a permissão aplicável não estiver confirmada.

## Instrumentos bloqueados por padrão

### MNA® completa
O site oficial da MNA informa que o instrumento pode ser incorporado ao prontuário eletrônico **com permissão** e em conformidade com copyright/marca. O formulário web permanece bloqueado enquanto `CLINICAL_LICENSE_MNA_EHR_CONFIRMED` não estiver explicitamente `true`.

### MEEM / MMSE®
A PAR informa que versões traduzidas/modificadas do MMSE exigem processo de permissão/licenciamento. A interface que reproduz o formulário do MEEM permanece bloqueada enquanto `CLINICAL_LICENSE_MMSE_ELECTRONIC_CONFIRMED` não estiver explicitamente `true`.

O prontuário pode manter separadamente um **registro rápido de pontuação** de um MEEM já aplicado, sem reproduzir itens protegidos. Esse registro não equivale à administração eletrônica do instrumento.

### MoCA®
Os termos/permissões oficiais do MoCA restringem reprodução/desenvolvimento eletrônico fora das modalidades autorizadas/licenciadas. A interface que reproduz o formulário permanece bloqueada enquanto `CLINICAL_LICENSE_MOCA_ELECTRONIC_CONFIRMED` não estiver explicitamente `true`.

O prontuário pode manter separadamente um **registro rápido de pontuação** de um MoCA já aplicado, sem reproduzir itens protegidos. Esse registro não equivale à administração eletrônica do instrumento.

## ISI — Insomnia Severity Index / Índice de Gravidade de Insônia

A ISI é distribuída pela Mapi Research Trust em nome do titular. O catálogo oficial informa condições específicas de uso e de implementação eletrônica. O prontuário **não incorpora o formulário ISI**: não contém os sete itens, alternativas, instruções ou uma tradução própria.

A interface adotada segue o mesmo princípio dos registros rápidos de MEEM/MoCA: o médico informa somente o **escore total de 0 a 28 de uma ISI/IGI já aplicada por meio autorizado**. O sistema persiste o total, classifica a faixa de gravidade para apoio clínico e acompanha o resultado longitudinalmente.

Essa entrada score-only não deve ser interpretada como autorização para reproduzir ou administrar eletronicamente o questionário. Se no futuro houver interesse em colocar os sete itens dentro do aplicativo, a permissão/licença e a versão `Portuguese for Brazil` deverão ser verificadas antes da implementação.

Referências clínicas registradas para a interpretação do escore:
- Bastien CH, Vallières A, Morin CM. *Validation of the Insomnia Severity Index as an outcome measure for insomnia research*. Sleep Med. 2001;2(4):297-307. PMID: 11438246.
- Castro LS. *Adaptação e validação do Índice de Gravidade de Insônia (IGI): Caracterização Populacional, Valores Normativos e Aspectos Associados*. Universidade Federal de São Paulo, 2011. Validação da versão em português em amostra adulta da cidade de São Paulo.

## Regra operacional

1. Nunca definir uma flag de reprodução eletrônica como `true` apenas porque o instrumento é clinicamente útil ou está reproduzido em livro/artigo.
2. Guardar a evidência documental de autorização/licença fora do Git e dos logs da aplicação.
3. Somente depois da autorização aplicável, definir a flag correspondente no ambiente de produção e reiniciar a aplicação.
4. O endpoint server-side também deve verificar a licença quando houver administração eletrônica protegida. Não é suficiente esconder o formulário no React.
5. Avaliações históricas já persistidas não são apagadas/reclassificadas por gates de licença.
6. Registros **score-only**, como MEEM/MoCA simplificados e ISI nesta implementação, não podem conter itens, alternativas ou instruções protegidas do instrumento original.

## Comportamento da interface

Quando uma licença de formulário não está confirmada:
- a definição completa do instrumento protegido não é enviada ao navegador;
- não existe formulário aplicável para nova administração eletrônica;
- a interface pode oferecer, quando clinicamente apropriado, somente um registro de escore previamente obtido, desde que não reproduza o conteúdo protegido.

## Evidência de liberação de formulários completos

Antes de liberar um instrumento protegido em versão completa, registrar internamente:
- titular/licenciante;
- escopo da permissão (clínico, eletrônico/EHR/web, organização/usuários);
- versão/idioma autorizado;
- data e prazo de validade, quando aplicável;
- eventuais requisitos de certificação/treinamento.

A confirmação dessas permissões é uma etapa humana/jurídica e não pode ser inferida automaticamente pelo software.
