-- CARG clinical activation approved by the Product Owner on 2026-09-06.
-- This migration supersedes only the earlier safety block. It does not alter
-- historical assessments, other electronic-scale license gates or clinical data.
UPDATE `ScaleDefinition`
SET
  `name` = 'CARG — risco de toxicidade da quimioterapia',
  `active` = true,
  `sourceNote` = 'Modelo CARG de Hurria et al. (2011), implementado localmente e versionado para estimar faixas de toxicidade grau 3 a 5. O resultado apoia a decisão clínica e não prescreve ajuste, suspensão ou escolha de tratamento.',
  `structuredSchema` = JSON_OBJECT(
    'calculator', 'domain:oncogeriatria/calculateCarg',
    'implementationStatus', 'AVAILABLE',
    'theoreticalScoreMax', 23,
    'observedOriginalRangeMax', 19,
    'riskBands', JSON_OBJECT('low', '0-5', 'intermediate', '6-9', 'high', '10-23'),
    'observedGradeThreeToFiveToxicityPercent', JSON_OBJECT('low', 30, 'intermediate', 52, 'high', 83),
    'authorizationSource', 'Product Owner technical transfer document v1.0 dated 2026-09-06'
  ),
  `updatedAt` = CURRENT_TIMESTAMP(3)
WHERE `code` = 'CARG' AND `version` = 'HURRIA_2011';
