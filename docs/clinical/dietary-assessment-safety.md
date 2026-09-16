# Avaliação alimentar — segurança de porções e metas clínicas

Versão clínica: `2026-09-13-dietary-portion-safety-v2`.

## Princípios

O recordatório alimentar é autorreferido e não é tratado como medição exata. Ausência de quantidade, unidade, peso, preparo ou divisão da preparação permanece como dado insuficiente; nunca é convertida silenciosamente em zero. Medidas caseiras e estimativas visuais não possuem peso universal no sistema.

Cada item calculável registra alimento/fonte, quantidade, unidade, gramas informados ou estimados, origem da quantidade e grau de incerteza. Nutrientes só são calculados quando alimento e massa utilizada estão suficientemente identificados. A composição nutricional é revalidada no servidor e a versão da fonte permanece no snapshot.

## Porções

- Ovo: quantidade em unidades. `1 ovo` significa uma unidade média de ovo inteiro; `2 ovos`, duas unidades. O sistema não converte três ovos em porção de carne, frango ou peixe.
- Relato apenas como “ovo” permanece incompleto até confirmação do número de unidades.
- Omelete exige confirmação de número de ovos e número de pessoas que consumiram a preparação; o tamanho não é usado para inferir ovos.
- Carne, frango e peixe: filé, bife, pedaço ou “palma da mão” são descritores de relato. “Palma da mão” é somente estimativa visual e sempre permanece marcada como `Estimativa — confirmar quantidade`.
- Colher, xícara, concha, fatia, pedaço e unidade não recebem conversão universal para gramas.

## Proteína e DRC na pessoa idosa

A regra clínica está no domínio, fora do componente React. A referência por TFG é uma sugestão inicial sujeita a revisão médica:

- TFG >=60 mL/min/1,73 m²: sem restrição proteica automática por DRC;
- TFG 45–59: aproximadamente 0,8 g/kg/dia;
- TFG 30–44: aproximadamente 0,8 g/kg/dia;
- TFG <30, sem diálise: 0,6–0,8 g/kg/dia;
- dieta muito baixa em proteína, 0,3–0,4 g/kg/dia: somente DRC, TFG <30, sem diálise, confirmação explícita e supervisão nefrológica/nutricional rigorosa;
- diálise: referência inicial 1,2–1,5 g/kg/dia somente após confirmar modalidade, peso de referência, perdas e estado nutricional.

Fragilidade, sarcopenia, desnutrição, perda de peso involuntária ou doença aguda bloqueiam interpretação simplista de restrição proteica e exigem individualização. A meta manual da médica pode substituir a sugestão de referência. O snapshot registra origem da meta e `ruleTrace`.

## Cálculo por peso

Quando peso e meta estão disponíveis, o resumo registra: peso e origem, meta em g/kg/dia, faixa total em gramas/dia, ingestão estimada em gramas e g/kg/dia e diferença para os limites da faixa. O resultado permanece identificado como dependente da completude e precisão do relato.

## Cálcio e orientações

Baixa ingestão estimada de cálcio gera revisão, não prescrição automática de suplemento. Exemplos alimentares são apresentados apenas para revisão clínica. Na presença de DRC, a seleção deve considerar função renal, fósforo, cálcio sérico, tolerância e plano nutricional.

A orientação final é organizada em quatro blocos: o que manter; o que melhorar; o que precisa ser confirmado; o que exige decisão médica ou nutricional. O texto é editável e não pode ser incorporado ao SOAP ou ao relatório sem revisão clínica explícita.

## Evidências e rastreabilidade

1. KDOQI Clinical Practice Guideline for Nutrition in CKD: 2020 Update. PMID 32829751. https://pubmed.ncbi.nlm.nih.gov/32829751/
2. ESPEN practical guideline: Clinical nutrition and hydration in geriatrics. PMID 35306388. https://pubmed.ncbi.nlm.nih.gov/35306388/
3. Dietary assessment methods evaluated in the Malmö food study. PMID 8429287. https://pubmed.ncbi.nlm.nih.gov/8429287/
4. EatWellQ8 web-based dietary intake validation with portion-size images. PMID 33650974. https://pubmed.ncbi.nlm.nih.gov/33650974/
5. Review highlighting the need for standardized portion-size estimation and composition data. PMID 32153884. https://pubmed.ncbi.nlm.nih.gov/32153884/
6. Diretriz BRASPEN/SBN/ASBRAN de terapia nutricional na doença renal, 2021. https://www.asbran.org.br/storage/downloads/files/2021/07/diretriz-de-terapia-nutricional-no-paciente-com-doenca-renal.pdf
7. KDIGO 2024 CKD Guideline Executive Summary. https://kdigo.org/wp-content/uploads/2017/02/KDIGO-2024-CKD-Guideline-Executive-Summary.pdf

As referências são sintetizadas em regras clínicas; trechos extensos não são reproduzidos. A decisão clínica final permanece com a profissional responsável.


## Refatoração 2026-09-16

A interface mantém o registro por porções, explicita as referências de medida — 3 ovos, palma da mão, 1 copo de leite, 1 unidade de iogurte e 2 fatias de queijo — e exibe a paciente e o status da avaliação no contexto da consulta.

As orientações condicionais são sugestões rastreáveis e editáveis. Hiperpotassemia direciona revisão individualizada sem exclusão automática de frutas, verduras ou leguminosas; fósforo elevado direciona revisão de aditivos sem exclusão automática de leite e derivados; diálise usa fluxo proteico próprio; edema, insuficiência cardíaca, oligúria ou hiponatremia bloqueiam recomendação hídrica automática.

A camada condicional utiliza os PMIDs 38519239, 32191264, 31734057, 20404416, 34113962 e 32671570, registrados no domínio e associados a cada orientação. Nenhuma orientação é promovida automaticamente a conduta no SOAP ou no relatório.
