# Gráficos por reaplicação e resultados em tabela — 08/10/2026

Base: `625b3d0` (`main`). Esta rodada incorpora os ajustes ainda não mesclados de `7d802f0` (cinco domínios e linhas visíveis), evitando perder a correção anterior.

- A exibição exige resultados em duas consultas distintas no mesmo domínio. Retornos sem reaplicação não habilitam um gráfico novo; históricos já habilitados permanecem.
- Audição e visão não habilitam nem geram gráficos de tela, impressão, PDF ou escalas individuais. Seus registros clínicos permanecem intactos.
- Domínios permitidos: Funcionalidade, Cognição, Locomoção, Humor e Vitalidade.
- O bloco longitudinal em texto corrido foi substituído por tabela com consulta/data, domínio, escala, resultado e classificação. Apenas avaliações registradas geram linhas; retornos vazios não repetem “Não avaliada”. A tabela principal de resultados/orientações do relatório permanece intacta.
- PDF apresenta os mesmos resultados em tabela, com cabeçalho repetido e quebra por linha. Lacunas não são preenchidas com zero ou resultados anteriores.
- Compatibilidade de cores persistidas: `green/yellow/red` e `verde/amarelo/vermelho` representam os mesmos estados já classificados pelo instrumento. Ausência de cor continua sem categoria; Katz sem classificação categórica não recebe linha inventada. E2E usa GDS-15 realmente pontuada e persistida pela API para verificar a linha.
- Preservados os segmentos entre conjuntos convergentes de instrumentos, versões compatíveis, grade, pontos e datas da correção anterior. A comparabilidade clínica e a inferência de inflexão não foram alteradas.

Validação: 934 golden masters completos, typecheck completo e de domínio, segurança do repositório e compilação Next de produção com configuração sintética. HTML real inspecionado em desktop e 390 px; sem transbordamento, cinco domínios, tabela presente e retorno vazio sem SVG. Impressão A4 e renderizador PDF real verificados. CI inclui persistência/isolamento MySQL, E2E autenticado das escalas, linha visível e tabela em desktop/mobile/print, além do build canônico com migrations/prestart. MySQL não está disponível localmente; esses gates dependem da CI antes do merge.

Sem migração, alteração de banco, SOAP, medicamentos, corte de escala ou orientação clínica. Snapshots já assinados não são modificados. Release esperada: `2026-10-08-graficos-reaplicacao-v1`. Produção só é confirmada após health e smoke da release. Smoke anônimo não substitui inspeção autenticada de produção.
