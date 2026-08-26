# Persistência visual dos gráficos longitudinais

Release: `2026-08-26-chart-persistence-v1`

## Correção

- mantém o gráfico de capacidade intrínseca e independência funcional depois que um domínio possui resultados em pelo menos duas consultas;
- consultas subsequentes sem reaplicação não ocultam os pontos históricos;
- troca de instrumento ou versão mantém os pontos visíveis, mas desconectados;
- preserva a regra metodológica: linhas e inflexões continuam restritas a resultados comparáveis do mesmo instrumento e versão;
- recupera a decisão de exibição a partir das células de snapshots anteriores que não possuam o novo indicador explícito.

## Verificação

- regressão para consulta subsequente sem reaplicação;
- regressão para consulta intermediária não avaliada;
- regressão para instrumentos e versões incompatíveis;
- compatibilidade com snapshots gerados antes desta release;
- smoke de produção vinculado ao identificador desta release.
