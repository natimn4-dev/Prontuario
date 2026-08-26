# Cornell estruturada

Release: `2026-08-26-cornell-structured-v1`

## Alteração

- Substitui o registro manual do total da Cornell por 19 itens estruturados.
- Cada item oferece 0 (ausente), 1 (leve/intermitente), 2 (grave) e “não foi possível avaliar”.
- Calcula o total no servidor e preserva as faixas clínicas previamente validadas.
- Mantém `co16` (ideação suicida) explicitamente persistido para o alerta clínico urgente já existente.
- Impede o cálculo e a persistência de classificação quando algum item não pôde ser avaliado.

## Segurança e compatibilidade

- Nenhuma migração de banco é necessária.
- Avaliações Cornell anteriores permanecem legíveis no histórico.
- Gráficos, demais escalas, SOAP, exames e relatórios não foram alterados.
- Fonte clínica: Alexopoulos et al., 1988, PMID 3337862.
