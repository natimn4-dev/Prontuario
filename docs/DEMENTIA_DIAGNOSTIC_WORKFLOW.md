# Fluxo de apoio à investigação de declínio cognitivo

## Finalidade

Este módulo organiza dados clínicos para apoiar a investigação etiológica de declínio cognitivo. Não diagnostica de forma autônoma, não substitui avaliação médica e não transforma rastreio, neuroimagem ou biomarcador isolado em causa definitiva dos sintomas.

## Versão clínica

- Protocolo principal: `dementia-diagnostic-support-2026-09-v1`
- Perfil cognitivo integrado: `cognitive-domain-profile-2026-09-v1`
- Data de revisão: 14 de setembro de 2026
- Escopo etiológico automatizado atual: doença de Alzheimer, demência com corpos de Lewy, comprometimento cognitivo vascular e LATE
- Diferenciais adicionais, como espectro frontotemporal/afasias progressivas, podem ser sinalizados para consideração clínica, mas não são classificados automaticamente por este módulo
- Estado: implementação sujeita a homologação clínica antes de produção

## Decisões clínicas codificadas

1. Instalação aguda, flutuação aguda ou déficit focal novo desviam o fluxo para avaliação de causa aguda.
2. Declínio em semanas ou poucos meses recebe via separada de investigação rapidamente progressiva.
3. MEEM, MoCA, fluência verbal e Teste do Relógio são instrumentos de rastreio/perfil cognitivo e não estabelecem etiologia isoladamente.
4. Atribuição funcional exige distinguir prejuízo cognitivo de limitações motoras, sensoriais, ambientais e sociais.
5. A hipótese vascular exige correlação clínico-radiológica; fatores de risco ou alterações leves incidentais não bastam.
6. Características centrais de corpos de Lewy são registradas separadamente: flutuação cognitiva persistente, alucinações visuais recorrentes, parkinsonismo espontâneo e transtorno comportamental do sono REM.
7. LATE é apresentado como hipótese probabilística. Idade avançada, síndrome amnésica lenta, atrofia hipocampal desproporcional e amiloide negativo aumentam o apoio; não existe biomarcador TDP-43 clínico validado para confirmação em vida.
8. Biomarcador positivo de Alzheimer evidencia patologia, mas sua contribuição para os sintomas deve ser integrada a fenótipo, estágio e copatologias.
9. Sugestões automáticas permanecem editáveis e exigem confirmação médica explícita.
10. O sistema nunca reconstrói subtotais cognitivos ausentes a partir de um escore global.
11. Um domínio com erros descreve o desempenho no item/subtotal; não é automaticamente rotulado como etiologia ou diagnóstico.
12. A fluência verbal semântica é registrada como valor bruto por 60 segundos e contextualizada pela escolaridade. O prontuário não aplica ponto de corte universal automático.
13. A síntese etiológica só pode priorizar uma hipótese quando o fluxo clínico está em via eletiva (`CONTINUE_ELECTIVE`) e já existem hipóteses derivadas dos demais dados clínicos. Vias aguda, rapidamente progressiva ou incompleta bloqueiam a priorização etiológica.
14. O perfil cognitivo entra apenas como concordância adicional com hipóteses clínicas já sustentadas; não substitui curso temporal, funcionalidade, exame neurológico, características sindrômicas, neuroimagem ou biomarcadores.
15. Empate entre hipóteses ou apoio apenas baixo resulta em saída mista/indeterminada, sem forçar uma etiologia única.

## Perfil cognitivo por dimensões

Quando o registro estruturado do instrumento estiver disponível, a aba Cognição consolida os seguintes domínios:

- orientação temporal;
- orientação espacial;
- orientação global;
- memória imediata/registro;
- atenção e memória operacional;
- memória recente/evocação tardia;
- função executiva/visuoespacial;
- nomeação;
- linguagem;
- repetição;
- leitura e execução;
- escrita;
- compreensão/comandos;
- abstração;
- fluência verbal semântica.

### MEEM

A versão estruturada registra separadamente: orientação temporal 0–5; orientação espacial 0–5; registro 0–3; atenção/cálculo ou palavra 0–5; memória recente 0–3; nomeação 0–2; repetição 0–1; escrita de frase 0–1; comandos 0–3; leitura e execução 0–1; cópia de diagrama 0–1. O total bruto permanece 0–30. Escolaridade contextualiza a interpretação e não altera matematicamente o escore bruto.

### MoCA

A versão estruturada registra: visuoespacial/executiva 0–5; nomeação 0–3; atenção 0–6; linguagem 0–3; abstração 0–2; evocação tardia 0–5; orientação 0–6. O total bruto é 0–30 e a correção educacional aplicável permanece explicitamente separada do bruto, limitada ao máximo do instrumento.

### Teste do Relógio

Para a versão Shulman 0–5, 4–5 permanece classificado como sem alteração pela regra adotada e 0–3 como alterado. O resultado é integrado principalmente ao domínio executivo/visuoespacial e deve ser contextualizado por visão, motricidade e escolaridade.

### Fluência verbal

A fluência semântica por animais registra o número de respostas válidas em 60 segundos e os anos completos de escolaridade. Como a escolaridade influencia o desempenho e não foi adotado um ponto de corte universal seguro para todos os contextos, o sistema não converte automaticamente o valor bruto em “normal/alterado” nem em etiologia.

## Síntese do perfil

A combinação dos domínios pode produzir uma descrição de padrão predominante, como:

- amnéstico;
- executivo/visuoespacial;
- linguagem;
- multidomínio;
- dados insuficientes/sem predomínio definido.

Essa descrição representa o padrão dos itens registrados e não é, por si só, um diagnóstico. Um padrão amnéstico pode ser concordante com doença de Alzheimer ou LATE; um padrão executivo/visuoespacial pode ser concordante com corpos de Lewy ou etiologia vascular; um padrão de linguagem pode justificar ampliar o diferencial para espectro frontotemporal/afasias progressivas. Sobreposição entre doenças é esperada e deve ser explicitamente considerada.

## Integração etiológica segura

A interface usa o título **“Hipótese etiológica mais apoiada pelos dados registrados”**, e não “diagnóstico automático”. A priorização só ocorre quando:

1. o fluxo clínico não está interrompido por condição aguda ou progressão rápida;
2. a avaliação não está classificada como incompleta para integração;
3. já existe hipótese etiológica com apoio clínico moderado ou alto no fluxo principal;
4. não há empate entre hipóteses com apoio equivalente;
5. o perfil cognitivo, quando disponível, é usado somente como elemento de concordância adicional.

A saída sempre informa que a confirmação permanece médica e depende da integração com funcionalidade, curso, exame neurológico, neuroimagem e biomarcadores quando indicados.

## Longitudinalidade

Quando há dados comparáveis, a aba Cognição apresenta `baseline → avaliação anterior → atual` por domínio. O sistema não descreve uma variação numérica como “clinicamente significativa” sem regra validada e documentada. Estados sem informação são apresentados como não avaliados/dados insuficientes, nunca como zero presumido.

## Licenciamento eletrônico

A reprodução eletrônica detalhada de MEEM/MMSE e MoCA permanece condicionada à confirmação de licença/permissão aplicável pelas variáveis de configuração já existentes. Na ausência dessa confirmação, o prontuário mantém o registro seguro de escore global quando disponível e não infere os subtotais que não foram coletados.

## Persistência e segurança

- Cada salvamento do fluxo diagnóstico cria nova versão; não há atualização ou exclusão silenciosa do histórico.
- As aplicações de escalas preservam `answers`, versão, escore e interpretação, permitindo consolidar os domínios sem nova migração de banco.
- O servidor deriva `patientId` da consulta e exige vínculo entre consulta e paciente.
- O perfil cognitivo longitudinal respeita o horizonte temporal da consulta e não usa avaliações futuras para interpretar uma consulta anterior.
- O relatório compartilhável exige registro com revisão clínica confirmada e cria `DocumentSnapshot` do tipo `DEMENTIA_REPORT`.
- Nenhum dado real de paciente é usado em testes ou documentação.

## Referências principais

1. Atri A et al. Alzheimer’s Association clinical practice guideline DETeCD-ADRD: executive summary for primary care. *Alzheimers Dement.* 2025. doi:10.1002/alz.14333.
2. Dickerson BC et al. DETeCD-ADRD: executive summary for specialty care. *Alzheimers Dement.* 2025. doi:10.1002/alz.14337.
3. Jack CR Jr et al. Revised criteria for diagnosis and staging of Alzheimer’s disease. *Alzheimers Dement.* 2024;20:5143-5169. PMID: 38934362.
4. McKeith IG et al. Diagnosis and management of dementia with Lewy bodies: fourth consensus report. *Neurology.* 2017;89:88-100. PMID: 28592453.
5. Sachdev P et al. Diagnostic criteria for vascular cognitive disorders: a VASCOG statement. *Alzheimer Dis Assoc Disord.* 2014;28:206-218. PMID: 24632990.
6. Wolk DA et al. Clinical criteria for limbic-predominant age-related TDP-43 encephalopathy. *Alzheimers Dement.* 2025;21:e14202. PMID: 39807681.
7. Weintraub S, Wicklund AH, Salmon DP. The neuropsychological profile of Alzheimer disease. *Cold Spring Harb Perspect Med.* 2012;2:a006171. PMID: 22474609.
8. Levy JA, Chelune GJ. Cognitive-behavioral profiles of neurodegenerative dementias: beyond Alzheimer’s disease. *J Geriatr Psychiatry Neurol.* 2007;20:227-238. PMID: 18004009.
9. Radanovic M et al. Verbal fluency in the detection of mild cognitive impairment and Alzheimer’s disease among Brazilian Portuguese speakers: the influence of education. PMID: 19619390.
10. Gravett S et al. Find-DLB: cognitive profile in a naturalistic cohort with dementia with Lewy bodies. *Eur Geriatr Med.* 2026;17:309-321. PMID: 41354725.

## Limitações deliberadas

- Os níveis de apoio baixo, moderado e alto são organização de evidências preenchidas, não categorias diagnósticas validadas.
- O módulo não calcula probabilidade numérica, não prescreve tratamento e não seleciona automaticamente escalas.
- O perfil cognitivo deriva somente dos itens estruturados efetivamente registrados; escore global legado não é decomposto retrospectivamente.
- A ausência de erro em um subtotal de rastreio não exclui comprometimento cognitivo sutil.
- A validação clínica deve verificar cenários mistos, baixa escolaridade, déficits sensoriais, depressão, delirium e multimorbidade antes de liberar produção.
