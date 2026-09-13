# Fluxo de apoio à investigação de declínio cognitivo

## Finalidade

Este módulo organiza dados clínicos para apoiar a investigação etiológica de declínio cognitivo. Não diagnostica de forma autônoma, não substitui avaliação médica e não transforma rastreio, neuroimagem ou biomarcador isolado em causa definitiva dos sintomas.

## Versão clínica

- Protocolo: `dementia-diagnostic-support-2026-09-v1`
- Data de revisão: 13 de setembro de 2026
- Escopo: doença de Alzheimer, demência com corpos de Lewy, comprometimento cognitivo vascular e LATE
- Estado: implementação inicial sujeita a homologação clínica antes de produção

## Decisões clínicas codificadas

1. Instalação aguda, flutuação aguda ou déficit focal novo desviam o fluxo para avaliação de causa aguda.
2. Declínio em semanas ou poucos meses recebe via separada de investigação rapidamente progressiva.
3. MEEM, MoCA e Teste do Relógio são apresentados como rastreio; não estabelecem etiologia isoladamente.
4. Atribuição funcional exige distinguir prejuízo cognitivo de limitações motoras, sensoriais, ambientais e sociais.
5. A hipótese vascular exige correlação clínico-radiológica; fatores de risco ou alterações leves incidentais não bastam.
6. Características centrais de corpos de Lewy são registradas separadamente: flutuação cognitiva persistente, alucinações visuais recorrentes, parkinsonismo espontâneo e transtorno comportamental do sono REM.
7. LATE é apresentado como hipótese probabilística. Idade avançada, síndrome amnésica lenta, atrofia hipocampal desproporcional e amiloide negativo aumentam o apoio; não existe biomarcador TDP-43 clínico validado para confirmação em vida.
8. Biomarcador positivo de Alzheimer evidencia patologia, mas sua contribuição para os sintomas deve ser integrada a fenótipo, estágio e copatologias.
9. Sugestões automáticas permanecem editáveis e exigem confirmação médica explícita.

## Persistência e segurança

- Cada salvamento cria nova versão; não há atualização ou exclusão do histórico.
- O servidor deriva `patientId` da consulta e exige a relação composta `consultationId + patientId`.
- Concorrência é controlada por versão esperada e transação serializável.
- O relatório compartilhável exige registro com revisão clínica confirmada e cria `DocumentSnapshot` do tipo `DEMENTIA_REPORT`.
- Nenhum dado real de paciente é usado em testes ou documentação.

## Referências principais

1. Atri A et al. Alzheimer’s Association clinical practice guideline DETeCD-ADRD: executive summary for primary care. *Alzheimers Dement.* 2025. doi:10.1002/alz.14333. https://pmc.ncbi.nlm.nih.gov/articles/PMC12173843/
2. Dickerson BC et al. DETeCD-ADRD: executive summary for specialty care. *Alzheimers Dement.* 2025. doi:10.1002/alz.14337. https://pmc.ncbi.nlm.nih.gov/articles/PMC11772716/
3. Jack CR Jr et al. Revised criteria for diagnosis and staging of Alzheimer’s disease. *Alzheimers Dement.* 2024;20:5143-5169. doi:10.1002/alz.13859. https://pubmed.ncbi.nlm.nih.gov/38934362/
4. McKeith IG et al. Diagnosis and management of dementia with Lewy bodies: fourth consensus report. *Neurology.* 2017;89:88-100. doi:10.1212/WNL.0000000000004058. https://pubmed.ncbi.nlm.nih.gov/28592453/
5. Sachdev P et al. Diagnostic criteria for vascular cognitive disorders: a VASCOG statement. *Alzheimer Dis Assoc Disord.* 2014;28:206-218. doi:10.1097/WAD.0000000000000034. https://pubmed.ncbi.nlm.nih.gov/24632990/
6. Wolk DA et al. Clinical criteria for limbic-predominant age-related TDP-43 encephalopathy. *Alzheimers Dement.* 2025;21:e14202. doi:10.1002/alz.14202. https://pubmed.ncbi.nlm.nih.gov/39807681/

## Limitações deliberadas

- Os níveis de apoio baixo, moderado e alto são organização de evidências preenchidas, não categorias diagnósticas validadas.
- O módulo não calcula probabilidade numérica, não prescreve tratamento e não seleciona automaticamente escalas.
- A validação clínica deve verificar cenários mistos, baixa escolaridade, déficits sensoriais, depressão, delirium e multimorbidade antes de liberar produção.
