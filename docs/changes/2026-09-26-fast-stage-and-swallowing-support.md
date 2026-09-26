# FAST e suporte à deglutição — 2026-09-25

## Escopo

- Apresentar os estágios FAST como códigos clínicos (`7E`, `6C`) em campos, históricos, relatórios e cópias; manter o valor ordinal numérico apenas para persistência e comparação longitudinal.
- Registrar, na consulta, disfagia, dieta adaptada, alimentação por sonda nasogástrica/nasoenteral e gastrostomia.
- Gerar orientações familiares apenas para opções confirmadas e salvas. A equipe revisa o relatório antes de compartilhá-lo.
- Gravar as opções ao lado da avaliação alimentar existente no JSON versionado da consulta, usando atualização otimista por `updatedAt`; preservar o recordatório alimentar e o vínculo paciente/consulta.

## Salvaguardas clínicas

- O registro não escolhe consistência, espessante, fórmula, volume, velocidade, horário ou medicamento.
- Dieta adaptada: seguir a consistência orientada pela equipe e observar ingestão e peso; a literatura descreve risco de ingestão nutricional reduzida com dietas de textura modificada.
- Sonda/GTT: seguir o plano já estabelecido e confirmar com médico/farmacêutico se uma apresentação de medicamento pode ser triturada, aberta ou administrada pela sonda.
- Se nenhuma opção estiver marcada, não é acrescentada orientação sobre disfagia ou via enteral.

## Evidência consultada no PubMed

- Wirth et al. Revisão de consenso sobre disfagia orofaríngea em pessoas idosas, avaliação individual e riscos nutricionais. PMID [26966356](https://pubmed.ncbi.nlm.nih.gov/26966356/).
- Wu et al. Revisão sistemática e meta-análise sobre ingestão nutricional em dietas de textura modificada. PMID [33371326](https://pubmed.ncbi.nlm.nih.gov/33371326/).
- Blaszczyk et al. Revisão sobre segurança no uso de medicamentos em disfagia e alimentação enteral. PMID [37707775](https://pubmed.ncbi.nlm.nih.gov/37707775/).
