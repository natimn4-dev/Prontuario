# ISI — integração segura por licença (2026-08-21)

## Objetivo
Adicionar a ISI — Insomnia Severity Index / Índice de Gravidade de Insônia — ao fluxo clínico sem fragmentar a caixa única **Escalas clínicas**, preservando cálculo automático, interpretação segura, longitudinalidade e integração com Plano por Problema.

## Implementado nesta branch
- engine de pontuação estruturada com sete respostas obrigatórias, cada uma restrita a 0–4;
- total automático 0–28, sem aceitar campo `total` informado manualmente;
- faixas de referência 0–7, 8–14, 15–21 e 22–28 com linguagem de sintomas/rastreio, sem diagnóstico automático;
- testes de fronteira obrigatórios 7/8, 14/15 e 21/22, além de 0/28, 28/28, soma intermediária e resposta ausente/inválida;
- domínio **Sono** dentro da mesma caixa unificada de Escalas clínicas (não existe painel de sono separado);
- proposta de problema `Sintomas de insônia / alteração do sono` somente quando o resultado atual estiver alterado e sempre sujeita à confirmação médica;
- sugestões profissionais editáveis e não prescritivas para caracterização do padrão sono-vigília e revisão de fatores associados;
- gate eletrônico fail-closed `CLINICAL_LICENSE_ISI_ELECTRONIC_CONFIRMED=false` por padrão;
- documentação de procedência científica e licenciamento.

## Evidência clínica revisada
1. Bastien CH, Vallières A, Morin CM. *Validation of the Insomnia Severity Index as an outcome measure for insomnia research*. Sleep Med. 2001;2(4):297-307. PMID 11438246.
2. Castro LS. *Adaptação e validação do Índice de Gravidade de Insônia (IGI): Caracterização Populacional, Valores Normativos e Aspectos Associados*. UNIFESP, 2011. Validação em amostra adulta da cidade de São Paulo.
3. Mapi Research Trust / ePROVIDE — catálogo oficial da ISI, incluindo tradução Portuguese for Brazil e condições específicas para implementação eletrônica.

## Bloqueio intencional antes da administração eletrônica
O formulário literal de sete itens **não foi copiado de páginas de terceiros nem reescrito por paráfrase**. A Mapi Research Trust informa que cópias de revisão não autorizam retyping/copying/translation/duplication e que eVersions possuem condições próprias.

Antes de tornar a ISI selecionável e administrável no navegador, é necessário documentar:
- autorização/licença aplicável ao uso eletrônico neste projeto;
- tradução `Portuguese for Brazil` efetivamente autorizada;
- texto oficial dos sete itens, alternativas e instruções;
- intervalo recordatório adotado (o catálogo oficial recomenda `last month` como padrão, admitindo períodos menores com consistência entre avaliações);
- eventuais exigências de revisão de screenshots/e-Booklet.

Somente após essa confirmação deve-se habilitar `CLINICAL_LICENSE_ISI_ELECTRONIC_CONFIRMED=true` e inserir o conteúdo licenciado na definição de formulário. Não usar uma tradução encontrada na internet como substituta.

## Próxima etapa após licença
1. adicionar a definição licenciada da ISI ao endpoint de escalas clínicas;
2. renderizar os sete itens com seleção exclusiva e significado visível;
3. salvar respostas + escore + classificação pela persistência genérica existente;
4. validar reabertura, histórico e gráfico longitudinal;
5. executar QA de UI e integração do relatório familiar sem prescrição automática.
