# Evitar repetição entre orientações do relatório familiar

Rodada de 27/10/2026. Base: `9888af46a04f124c9c5828877389fcd1d1b042aa`.

Ao montar as linhas de orientação de cada domínio, o relatório remove a segunda ocorrência de um item educativo completo quando ele é idêntico a um item mostrado em outro domínio. A comparação normaliza maiúsculas, espaços e pontuação; mantém a primeira ocorrência na ordem estabelecida dos domínios.

A regra vale para a tabela/relatório acessível e a exportação em texto. Itens específicos, avisos diferentes que tratam do mesmo assunto e variações que dependem da pontuação permanecem. Essa abordagem remove duplicação literal sem tentar inferir equivalência clínica. Os resultados das escalas, interpretações, plano de cuidado e orientações fora das linhas de domínio não são modificados.

Um teste com ECOG 2, KPS 60 e Charlson verifica que as três orientações gerais antes repetidas ficam uma vez no relatório e no texto, enquanto os cuidados próprios de ECOG, Karnofsky e Charlson continuam presentes. Uma análise sintética com vários domínios não encontrou outras frases completas idênticas entre as orientações amostradas.

## Validação

Validação local: 954 testes golden masters, incluindo 8 testes focados de oncogeriatria/prognóstico, typecheck completo e de domínio, `validate:repo` e `git diff --check`. O PR executará a suíte CI completa com MySQL efêmero, navegador autenticado, capturas e PDF A4, build de produção e smoke público após publicação. A verificação funcional e visual usa apenas dados sintéticos.
