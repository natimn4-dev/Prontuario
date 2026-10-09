# Orientações familiares: sonda vesical

A solicitação clínica da médica responsável é implementada com dois checkboxes independentes em Nutrição → Contextualizar → Uso de sonda vesical. A seleção é confirmada e salva explicitamente por consulta; ausência de registro não significa uso nem ausência clínica de sonda. Nenhuma escala, problema de incontinência ou consulta anterior infere a seleção. Nenhuma prescrição, horário de cateterização ou indicação de sondagem é gerada.

O contexto versionado `urinary-catheter-support-v1` fica em `assessment.urinaryCatheterContext`, separado de nutrição e deglutição. Reutiliza o endpoint de contexto da consulta com autorização, versão otimista, transação serializável, auditoria e bloqueio da consulta finalizada. Mantém dados existentes, SOAP, escalas, medicamentos e snapshots anteriores. Novos snapshots e saídas texto/HTML/PDF incluem somente os tipos marcados; desmarcar ambos remove a seção das novas saídas. A revisão clínica obrigatória anterior à exportação permanece vigente.

## Ajustes clínicos ao texto solicitado

- A sonda de demora permanece conectada ao sistema fechado; troca entre bolsas requer treinamento específico do modelo, sem desconexão autônoma ou instrução genérica de álcool na conexão. Desconexões/vazamentos exigem avaliação da equipe para substituição segura.
- Não fixar troca de sonda em quatro semanas. Intervalo depende da indicação clínica, do material, do fabricante e do plano da equipe.
- Cateterismo intermitente domiciliar usa técnica limpa após treinamento. Horários são individualizados, sem impor quatro a seis vezes por dia. Sondas de uso único são descartadas; reutilização somente em modelo apropriado e com protocolo explícito da equipe.
- Urina turva ou odor forte isolados não confirmam infecção; mudanças persistentes devem ser comunicadas. Febre, dor, calafrios, sangue, ausência de drenagem, obstrução e dificuldade persistente exigem avaliação. Mudança súbita de consciência tem várias causas e exige avaliação rápida, sem atribuição automática à infecção urinária.
- Mantidos higiene, fixação, bolsa abaixo da bexiga e fora do chão, esvaziamento quando pela metade, observação diária, hidratação conforme restrições, constipação e apoio emocional.

## Fontes primárias

- CDC, Summary of Recommendations, prevenção de infecção associada a cateter: https://www.cdc.gov/infection-control/hcp/cauti/summary-of-recommendations.html (II.A–E, III.A–D, III.G–H).
- IDSA 2019, Asymptomatic Bacteriuria: https://www.idsociety.org/practice-guideline/asymptomatic-bacteriuria/ (idosos, delirium sem sintomas urinários/sistêmicos; cateteres).
- NHS, Living with a urinary catheter: https://www.nhs.uk/tests-and-treatments/urinary-catheters/living-with/ (higiene, bolsa, sintomas e suporte).
- Gloucestershire Hospitals NHS, ISC for adults: https://www.gloshospitals.nhs.uk/your-visit/patient-information-leaflets/intermittent-self-catheterisation-isc-adults/ (treinamento, técnica limpa, sonda descartável, frequência individual).

## Validação

Casos sintéticos: sem registro, nenhuma seleção, demora, alívio, ambos, retirada das seleções, registro inválido e legado. Testes cobrem persistência sem sobrescrever contextos, filtro familiar sem perda de orientações e texto por tipo. A CI cobre MySQL efêmero (isolamento, versão e consulta finalizada) e interface autenticada (marcar/salvar/reabrir/gerar/desmarcar e acesso negado). Revisão visual usa somente pacientes sintéticos e o gerador real de PDF A4.
