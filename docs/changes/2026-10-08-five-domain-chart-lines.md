# Cinco domínios e linhas visíveis — 08/10/2026

Base: `625b3d0` (`main`). Gráficos: Funcionalidade, Cognição, Locomoção, Humor e Vitalidade. Audição e visão permanecem registradas no modelo e nas saídas clínicas, sem gráficos.

## Causa e correção

A apresentação dependia de uma chave única de comparabilidade. Quando instrumentos da mesma prioridade concordavam (por exemplo Lawton e Barthel), o domínio registrava um estado convergente sem chave única e todos os segmentos eram descartados. A apresentação agora conecta estados válidos quando o conjunto de instrumentos selecionados e suas versões é exatamente o mesmo. Não cria escore composto, não muda a classificação clínica e não modifica as regras de inflexão do modelo.

Troca de conjunto/versão, discordância e dados insuficientes interrompem a linha. Consulta sem reaplicação permanece ausente; conexão entre medidas comparáveis com visita vazia intermediária é tracejada. Um único resultado mantém apenas o marcador.

HTML e PDF usam a mesma seleção de cinco domínios e segmentos. A referência enviada orientou linhas mais visíveis, pontos preenchidos, grade cartesiana e eixos. Tela mostra datas; impressão usa números vinculados às datas na lista de resultados para evitar sobreposição. Mobile adapta o gráfico à largura disponível. Escalas exclusivamente sensoriais não geram gráficos individuais.

## Validação

928 golden masters, incluindo regressões de conjunto convergente, mudança de versão/conjunto, discordância, lacunas, seleção de domínios e preservação dos registros sensoriais. Typecheck completo e do domínio, segurança do repositório e compilação Next de produção. Inspeção com paciente sintético em desktop, 390 px e impressão A4. PDF real mantém lacunas, datas e escores.

E2E autenticado da CI também verifica a linha renderizada a partir de Katz persistido na primeira e segunda consultas, os cinco domínios e a ausência de trajetórias sensoriais.

MySQL local indisponível: build canônico (migrations/prestart), integração/persistência e E2E autenticado são gates da CI antes de merge. A compilação Next local não substitui o build canônico. Sem migração ou alteração de dados, SOAP ou medicamentos. Snapshots assinados existentes permanecem preservados. Produção precisa atingir `releaseId=2026-10-08-cinco-dominios-linhas-v1` e passar no smoke; inspeção clínica autenticada em produção não é substituída pelo smoke anônimo.
