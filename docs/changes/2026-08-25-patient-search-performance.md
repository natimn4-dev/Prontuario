# Busca de paciente — correção de desempenho em produção

## Causa corrigida

A busca prosseguia para as rotas de compatibilidade legada sempre que retornava
menos de oito resultados. Mesmo quando o paciente já havia sido localizado pelo
índice canônico, isso podia executar até 20 páginas adicionais com consultas
associadas e atrasar a resposta no banco de produção.

## Comportamento desta release

- resultado pelo índice canônico encerra a busca imediatamente;
- a consulta por `fullName` só é usada quando o índice não encontra candidato;
- o fallback paginado só é usado quando as duas estratégias anteriores não
  encontram candidato;
- cookies da sessão são enviados explicitamente pela interface no `fetch` de
  mesma origem;
- identidade mínima, permissões, homônimos e destino da consulta permanecem
  inalterados.

## Verificação

- teste de regressão garante uma única consulta no caminho indexado comum;
- teste de regressão garante que o caminho legado só é acionado após ausência
  real no índice;
- suíte completa e checagem de tipos permanecem obrigatórias;
- produção é identificada por
  `2026-08-25-patient-search-performance-v4` antes do smoke final.
