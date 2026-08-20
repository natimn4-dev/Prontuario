# Avaliações complementares — refinamento de UX clínica

## Objetivo

Reduzir carga visual e terminologia técnica no bloco de avaliações complementares durante a consulta, sem alterar cálculo, persistência, longitudinalidade ou regras clínicas.

## Alterações

- renomeia o bloco para **Avaliações complementares**;
- agrupa instrumentos por dimensão clínica no seletor;
- remove da superfície principal termos de implementação como legado, versionamento e rastreabilidade;
- reduz o fluxo visual a instrumento → campos → salvar resultado → interpretação → último registro;
- destaca a interpretação e o último resultado conhecido;
- move fonte e ressalvas técnicas para o bloco recolhido **Sobre a interpretação**;
- melhora foco de teclado, alvos de toque e responsividade em telas menores;
- mantém o componente fora da impressão.

## Segurança preservada

- nenhum ponto de corte, score, classificação ou interpretação foi alterado;
- nenhuma avaliação é criada automaticamente;
- consultas finalizadas permanecem somente leitura;
- o histórico continua vindo do endpoint server-side, incluindo as proteções temporais já incorporadas à `main`;
- MoCA e MEEM continuam como registro de resultado, sem reprodução do formulário completo;
- o relatório destinado ao paciente/família e o plano de medicamentos não são modificados por esta mudança.

## Origem

Esta mudança reaplica, sobre a `main` atual, o refinamento visual previamente revisado no PR #70, evitando integrar uma branch antiga que ficou atrás das salvaguardas longitudinais e de relatório incorporadas posteriormente.
