# Escalas psicossociais Freitas/Py — versões validadas

Data: 2026-08-19

## Novas aplicações estruturadas

### CES-D — 20 itens
- itens conforme Tabela A.13 do Freitas/Py;
- frequência 0–3 na última semana;
- itens positivos 4, 8, 12 e 16 com pontuação reversa;
- total 0–60;
- validação brasileira em idosos: corte >11, implementado como `>=12` para rastreio positivo;
- rastreio não equivale a diagnóstico de depressão.

### MOS-SSS — 19 itens
- itens e quatro domínios conforme Tabela A.15 do Freitas/Py;
- respostas 0–4, de nunca a sempre;
- escore total e domínios transformados para 0–100;
- maior escore = maior apoio percebido;
- nenhum cutoff universal brasileiro é aplicado automaticamente.

### APGAR familiar
- cinco itens conforme Tabela A.16 do Freitas/Py;
- nunca=0, algumas vezes=1, sempre=2;
- total 0–10;
- validação psicométrica em idosos do Nordeste brasileiro: 0–4 elevada disfunção, 5–6 moderada disfunção e 7–10 boa funcionalidade;
- instrumento de rastreio de funcionamento/satisfação familiar percebida, não diagnóstico isolado.

### Zarit Burden Interview — 22 itens
- itens conforme Tabela A.17 do Freitas/Py, com redação/pontuação resolvida pela versão brasileira validada de Scazufca quando o apêndice é ambíguo;
- item 16: incapacidade percebida de continuar cuidando por muito mais tempo;
- itens 1–21: frequência 0–4;
- item 22: intensidade global de sobrecarga, de nem um pouco=0 a extremamente=4;
- total 0–88;
- maior escore = maior sobrecarga percebida;
- nenhuma faixa automática de gravidade foi adicionada, pois a validação brasileira usada aqui sustenta o instrumento/direção do escore, mas não é usada para importar categorias posteriores de outras populações.

## Segurança

Todos os instrumentos usam `scaleCode`/`scaleVersion` novos. O navegador envia somente respostas estruturadas; score, classificação e interpretação são calculados no domínio/servidor. Respostas ausentes, extras ou fora da faixa falham fechado. Avaliações históricas permanecem intactas e não são convertidas.

## Fontes complementares

- Batistoni, Neri & Cupertino (2007): validade da CES-D em idosos brasileiros.
- Griep et al. / estudos brasileiros do MOS Social Support Survey: adaptação de 19 itens e transformação 0–100.
- Silva et al. (2014): propriedades psicométricas do APGAR familiar em idosos do Nordeste brasileiro.
- Scazufca (2002): versão brasileira da Burden Interview de 22 itens.
