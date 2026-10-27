# Orientações familiares — oncogeriatria e prognóstico

Rodada de 27/10/2026. Base: `1752d8197dc1e64b0bd5d8918cf6d93ffd8070bc`.

## Problema e comportamento

O relatório usava orientações genéricas por domínio e limitava a exibição a duas frases. Isso suprimia inclusive a orientação de contato com a equipe. Agora estes dois domínios preservam todos os itens educativos, com explicações de ECOG, Karnofsky e Charlson somente quando o instrumento estiver avaliado na consulta alvo. Resultados históricos não são promovidos a resultados atuais.

As orientações abordam decisão compartilhada, autonomia, apoio familiar, alimentação e reabilitação individualizadas, medicamentos, monitoramento de mudanças e plano de contato. Prognóstico inclui limites da previsão individual, prioridades de cuidado e apoio paliativo quando indicado, inclusive junto ao tratamento ativo.

Nenhum ponto de corte, escore, classificação, elegibilidade oncológica ou estimativa de sobrevida foi alterado. Não há conversão ECOG↔Karnofsky, nova prescrição ou indicação automática de cuidados paliativos. A tabela, a revisão clínica antes de compartilhar, a persistência e os contratos de identidade permanecem com a implementação existente. O módulo recebe apenas avaliações já selecionadas no modelo da consulta.

## Evidências consultadas no PubMed

- ASCO 2023, PMID [37459573](https://pubmed.ncbi.nlm.nih.gov/37459573/): avaliação geriátrica multidimensional e manejo dos déficits em idosos recebendo terapia sistêmica. Consultados metadados, resumo e trecho inicial do texto integral (30.000 de 62.118 caracteres); sem alegação de revisão integral. Recomendações 1.1 e 2.1 sustentam o cuidado individualizado e o uso conjunto dos domínios.
- Charlson et al. 2022, PMID [34991091](https://pubmed.ncbi.nlm.nih.gov/34991091/): revisão crítica das propriedades do índice e de sua validade prognóstica em diferentes populações. Não oferece certeza sobre sobrevida individual. Metadados e resumo consultados.
- Chow et al. 2020, PMID [31806655](https://pubmed.ncbi.nlm.nih.gov/31806655/): revisão sistemática e meta-análise, evidência moderada, sobre concordância entre avaliação do paciente e do profissional em ECOG/KPS; sustenta escuta e contextualização, sem equivalência automática entre escalas. Metadados e resumo consultados.
- ASCO 2024, PMID [38748941](https://pubmed.ncbi.nlm.nih.gov/38748941/): integração precoce de cuidados paliativos no câncer avançado e apoio a pacientes/cuidadores, concomitante ao tratamento ativo. Metadados e resumo consultados.

As frases educativas são uma síntese clínica em linguagem acessível, não traduções literais dos artigos. Não se introduzem faixas prognósticas locais como categorias validadas. As referências ficam disponíveis no apêndice técnico já existente.

## Verificação

Testes específicos verificam preservação do item final de contato, explicações por instrumento, ausência de previsão numérica de sobrevida, ausência de dados, exclusão de consulta anterior, isolamento de paciente e serialização do modelo. A suíte existente cobre persistência real em MySQL na CI, SOAP, medicamentos, bloqueio de compartilhamento e impressão.

Validação local: 950 testes golden master, typecheck completo e domínio, Prisma generate e build Next.js de produção com configuração sintética. O build guardado completo (`npm run build`) e a persistência MySQL dependem do banco efêmero da CI; não foi usado banco de produção. O Chromium local não abre por bloqueio de sockets do ambiente. A tentativa de renderização alternativa com WeasyPrint não reproduz fielmente a largura da tabela; não é considerada aprovação visual. A CI ganhou um cenário autenticado específico que preenche as três escalas, gera o relatório real, verifica as explicações e a orientação final de contato, verifica largura mobile e produz capturas desktop/mobile/print e PDF A4. Merge depende dos gates remotos e revisão dessa evidência.
