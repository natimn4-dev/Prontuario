-- Oncogeriatria safe persistence: optimistic concurrency, durable CARG draft/audit metadata,
-- immutable reviewed report snapshots and request idempotency receipts.
-- Additive migration; no clinical rows are deleted or rewritten.

ALTER TABLE `OncogeriatricCheckpoint`
  ADD COLUMN `revision` INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN `cargDraft` JSON NULL,
  ADD COLUMN `cargCompletionCount` INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN `cargPendingFields` JSON NULL,
  ADD COLUMN `cargLabProvenance` JSON NULL,
  ADD COLUMN `cargSavedById` VARCHAR(191) NULL,
  ADD COLUMN `cargSavedAt` DATETIME(3) NULL;

CREATE INDEX `OncoCheckpoint_episode_revision_idx`
  ON `OncogeriatricCheckpoint`(`episodeId`, `revision`);
CREATE INDEX `OncoCheckpoint_carg_saved_by_idx`
  ON `OncogeriatricCheckpoint`(`cargSavedById`, `cargSavedAt`);

ALTER TABLE `OncogeriatricReportSnapshot`
  ADD COLUMN `contentHash` VARCHAR(64) NULL,
  ADD COLUMN `g8AssessmentId` VARCHAR(191) NULL,
  ADD COLUMN `cargAssessmentId` VARCHAR(191) NULL,
  ADD COLUMN `clinicalReviewConfirmedById` VARCHAR(191) NULL,
  ADD COLUMN `clinicalReviewConfirmedAt` DATETIME(3) NULL;

CREATE INDEX `OncoReportSnapshot_carg_assessment_idx`
  ON `OncogeriatricReportSnapshot`(`cargAssessmentId`, `episodeId`);
CREATE INDEX `OncoReportSnapshot_g8_assessment_idx`
  ON `OncogeriatricReportSnapshot`(`g8AssessmentId`, `episodeId`);
CREATE INDEX `OncoReportSnapshot_review_idx`
  ON `OncogeriatricReportSnapshot`(`episodeId`, `clinicalReviewConfirmedAt`);

ALTER TABLE `OncogeriatricCheckpoint`
  ADD CONSTRAINT `OncoCheckpoint_carg_saved_by_fkey`
    FOREIGN KEY (`cargSavedById`) REFERENCES `User`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `OncogeriatricReportSnapshot`
  ADD CONSTRAINT `OncoReportSnapshot_g8_assessment_fkey`
    FOREIGN KEY (`g8AssessmentId`) REFERENCES `ScaleAssessment`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `OncoReportSnapshot_carg_assessment_fkey`
    FOREIGN KEY (`cargAssessmentId`) REFERENCES `ScaleAssessment`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `OncoReportSnapshot_reviewed_by_fkey`
    FOREIGN KEY (`clinicalReviewConfirmedById`) REFERENCES `User`(`id`)
    ON DELETE SET NULL ON UPDATE CASCADE;

-- Explicit temporal linkage for relevant oncogeriatric events. Nullable columns preserve legacy rows.
ALTER TABLE `OncogeriatricIntervention`
  ADD COLUMN `consultationId` VARCHAR(191) NULL,
  ADD COLUMN `startedAt` DATETIME(3) NULL;
CREATE INDEX `OncoIntervention_consultation_patient_idx` ON `OncogeriatricIntervention`(`consultationId`, `patientId`);
CREATE INDEX `OncoIntervention_episode_started_idx` ON `OncogeriatricIntervention`(`episodeId`, `startedAt`);

ALTER TABLE `OncogeriatricToxicityEvent`
  ADD COLUMN `consultationId` VARCHAR(191) NULL;
CREATE INDEX `OncoToxicity_consultation_patient_idx` ON `OncogeriatricToxicityEvent`(`consultationId`, `patientId`);

ALTER TABLE `OncogeriatricRecoveryAssessment`
  ADD COLUMN `consultationId` VARCHAR(191) NULL;
CREATE INDEX `OncoRecovery_consultation_patient_idx` ON `OncogeriatricRecoveryAssessment`(`consultationId`, `patientId`);

ALTER TABLE `OncogeriatricIntervention`
  ADD CONSTRAINT `OncoIntervention_consultation_patient_fkey`
    FOREIGN KEY (`consultationId`, `patientId`) REFERENCES `Consultation`(`id`, `patientId`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `OncogeriatricToxicityEvent`
  ADD CONSTRAINT `OncoToxicity_consultation_patient_fkey`
    FOREIGN KEY (`consultationId`, `patientId`) REFERENCES `Consultation`(`id`, `patientId`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `OncogeriatricRecoveryAssessment`
  ADD CONSTRAINT `OncoRecovery_consultation_patient_fkey`
    FOREIGN KEY (`consultationId`, `patientId`) REFERENCES `Consultation`(`id`, `patientId`)
    ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE `OncogeriatricOperationReceipt` (
  `id` VARCHAR(191) NOT NULL,
  `patientId` VARCHAR(191) NOT NULL,
  `episodeId` VARCHAR(191) NULL,
  `operationId` VARCHAR(128) NOT NULL,
  `action` VARCHAR(64) NOT NULL,
  `entityType` VARCHAR(96) NOT NULL,
  `entityId` VARCHAR(191) NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `OncoOperationReceipt_patient_operation_key`(`patientId`, `operationId`),
  INDEX `OncoOperationReceipt_episode_created_idx`(`episodeId`, `createdAt`),
  INDEX `OncoOperationReceipt_entity_idx`(`entityType`, `entityId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `OncogeriatricOperationReceipt`
  ADD CONSTRAINT `OncoOperationReceipt_patient_fkey`
    FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `OncoOperationReceipt_episode_patient_fkey`
    FOREIGN KEY (`episodeId`, `patientId`)
    REFERENCES `OncogeriatricEpisode`(`id`, `patientId`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
