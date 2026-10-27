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

## Atualização necessária para o gate de segurança

A CI do conteúdo clínico aprovou MySQL, 951 testes, E2E e build guardado/PRESTART, mas falhou em `npm audit --omit=dev --audit-level=critical`. O gate foi preservado. Atualizados Next.js e SWC de 16.3.8 para 16.4.3; Better Auth e o adaptador Prisma de 1.6.27 para 1.7.14, com dependências coordenadas no lockfile. React, Prisma, esquema do banco, configuração OAuth, permissões e regras clínicas não foram modificados. O lockfile foi resolvido sem `--force`/`--legacy-peer-deps` e validado com `npm ci` e `npm ls`.

Referências dos alertas de pacote:
- https://github.com/advisories/GHSA-2464-fhr4-w9xw — Next/Image Optimization; correção a partir de 16.4.1 e sharp 0.35.5.
- https://github.com/advisories/GHSA-673q-mjm6-r5xr — Next/Cache Components; correção a partir de 16.4.1.
- https://github.com/advisories/GHSA-965c-763c-88jm — Better Auth/OAuth state + Magic Link; correção a partir de 1.7.7. O aplicativo não configura Magic Link; o alerta do pacote não é evidência de exploração ou de incidente no prontuário. A atualização é exigida pelo gate por versão.

Após a atualização, a auditoria local não identificou dependências críticas. Permanecem 8 alertas não críticos (1 moderado e 7 altos) em dependências preexistentes; não são considerados resolvidos nesta rodada. Não foi realizado um scan de segurança de toda a aplicação. Os 951 golden masters e typechecks foram repetidos com as novas versões. O novo SHA exige CI completa antes de merge.
