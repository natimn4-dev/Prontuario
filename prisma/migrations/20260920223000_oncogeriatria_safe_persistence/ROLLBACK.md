# Rollback — oncogeriatria safe persistence

Prefer **code rollback** while leaving this additive migration in place. The added columns, indexes and receipt table are backward-compatible and preserve traceability. Do not delete historical clinical rows to simplify rollback.

A physical schema rollback should only be considered after confirming that no deployed code depends on idempotency receipts, checkpoint revisions, CARG draft/provenance metadata, explicit event links or reviewed snapshots. If a physical rollback is unavoidable, execute in this order:

1. Drop the new foreign keys from event linkage:
   - `OncoIntervention_consultation_patient_fkey`;
   - `OncoToxicity_consultation_patient_fkey`;
   - `OncoRecovery_consultation_patient_fkey`.
2. Drop the new foreign keys from CARG/snapshot review metadata:
   - `OncoCheckpoint_carg_saved_by_fkey`;
   - `OncoReportSnapshot_g8_assessment_fkey`;
   - `OncoReportSnapshot_carg_assessment_fkey`;
   - `OncoReportSnapshot_reviewed_by_fkey`.
3. Drop the foreign keys on `OncogeriatricOperationReceipt` (`OncoOperationReceipt_episode_patient_fkey`, then `OncoOperationReceipt_patient_fkey`) and drop the receipt table.
4. Drop event-link indexes:
   - `OncoIntervention_consultation_patient_idx`;
   - `OncoIntervention_episode_started_idx`;
   - `OncoToxicity_consultation_patient_idx`;
   - `OncoRecovery_consultation_patient_idx`.
5. Drop snapshot indexes:
   - `OncoReportSnapshot_carg_assessment_idx`;
   - `OncoReportSnapshot_g8_assessment_idx`;
   - `OncoReportSnapshot_review_idx`.
6. Drop checkpoint indexes:
   - `OncoCheckpoint_episode_revision_idx`;
   - `OncoCheckpoint_carg_saved_by_idx`.
7. Drop event-link columns:
   - `OncogeriatricIntervention.consultationId`;
   - `OncogeriatricIntervention.startedAt`;
   - `OncogeriatricToxicityEvent.consultationId`;
   - `OncogeriatricRecoveryAssessment.consultationId`.
8. Drop snapshot columns `contentHash`, `g8AssessmentId`, `cargAssessmentId`, `clinicalReviewConfirmedById`, `clinicalReviewConfirmedAt`.
9. Drop checkpoint columns `revision`, `cargDraft`, `cargCompletionCount`, `cargPendingFields`, `cargLabProvenance`, `cargSavedById`, `cargSavedAt`.

Do **not** delete pre-existing `Oncogeriatric*` clinical rows, `ScaleAssessment` rows, audit events or report snapshot content as part of rollback. Existing snapshots remain immutable clinical records even if the application code is rolled back.
