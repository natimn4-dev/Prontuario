# Auditoria dos gráficos longitudinais — 06/10/2026

Base: `e6508edc1c18a7f3b04598c0b7f8d7d17dece86d` (`main`).

## Problemas e correções

- A condição de exibição exigia dois registros no mesmo domínio: agora, a partir da segunda consulta, o histórico aparece se existir pelo menos um resultado. Consultas sem reaplicação continuam ausentes, sem preencher zero ou copiar resultados anteriores.
- HTML e PDF implementavam segmentos separadamente: ambos usam a mesma projeção testada, interrompem instrumentos/versões incompatíveis e identificam lacunas com trecho tracejado.
- Mudanças de escore dentro da mesma categoria não apareciam na trajetória: os escores e classificações persistidos são apresentados por consulta, sem recalcular instrumentos ou afirmar significância clínica.
- Datas coincidentes sobrepunham pontos: âncoras temporais são preservadas, com marcadores deslocados e consultas numeradas relacionadas às datas completas no índice de resultados.
- O resumo do PDF não datava o último resultado: agora informa a data e se a avaliação não foi reaplicada na consulta mais recente.
- O histórico completo era reduzido excessivamente na impressão: HTML usa blocos de até seis consultas e PDF de até dez, com uma consulta sobreposta para manter o trecho entre blocos. Texto longitudinal de 11 pt e quebra por domínio, sem perder resultados.

Sem migration, alteração de ponto de corte, nova interpretação clínica ou alteração no SOAP e na tabela de medicamentos. A identidade visual, a revisão humana e a seleção por paciente/consulta continuam preservadas. Snapshots já assinados não são modificados.

## Validação

- Golden masters completos, incluindo seis testes de apresentação e um teste que executa o renderizador PDF real.
- Typecheck do domínio e completo; checagem de segurança do repositório; compilação Next de produção com Node 22.
- Inspeção de HTML sintético em desktop e celular (390 px sem transbordamento), segunda consulta sem reaplicação e impressão A4 com 12 consultas. Inspeção do PDF destinado à assinatura, incluindo tracejado e data do último resultado.
- O ambiente local não possui MySQL: o build canônico com migrations/prestart e os testes de persistência/E2E autenticados são gates da CI antes do merge. A compilação Next local não substitui esses gates.
- Produção exige confirmação do health `releaseId=2026-10-06-graficos-longitudinais-v1` e smoke do SHA mesclado. Smoke anônimo não substitui inspeção clínica autenticada.

Rollback de aplicação: versão anterior `e6508edc1c18a7f3b04598c0b7f8d7d17dece86d`. Não há mudança de schema nesta rodada; nenhum backup/restauração ou purge é necessário para corrigir estes gráficos.
