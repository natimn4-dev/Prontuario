ALTER TABLE `DocumentSnapshot`
  MODIFY `type` ENUM('SOAP', 'FAMILY_REPORT', 'MEDICATION_PLAN', 'AGA_REPORT', 'DEMENTIA_REPORT') NOT NULL;

CREATE TABLE `CognitiveDiagnosticAssessment` (
  `id` VARCHAR(191) NOT NULL,
  `patientId` VARCHAR(191) NOT NULL,
  `consultationId` VARCHAR(191) NOT NULL,
  `recordedById` VARCHAR(191) NOT NULL,
  `version` INTEGER NOT NULL,
  `protocolVersion` VARCHAR(191) NOT NULL,
  `safety` JSON NOT NULL,
  `clinical` JSON NOT NULL,
  `keyFeatures` JSON NOT NULL,
  `labs` JSON NOT NULL,
  `imaging` JSON NOT NULL,
  `biomarkers` JSON NOT NULL,
  `neuropsychologySummary` TEXT NULL,
  `clinicianSyndrome` TEXT NULL,
  `clinicianPrimaryHypothesis` TEXT NULL,
  `clinicianDifferentials` TEXT NULL,
  `interpretation` JSON NOT NULL,
  `reportText` LONGTEXT NOT NULL,
  `clinicianReviewed` BOOLEAN NOT NULL DEFAULT false,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

  UNIQUE INDEX `CognitiveDiagnosticAssessment_consultationId_version_key`(`consultationId`, `version`),
  INDEX `CognitiveDiagnosticAssessment_patientId_createdAt_idx`(`patientId`, `createdAt`),
  INDEX `CognitiveDiagnosticAssessment_recordedById_createdAt_idx`(`recordedById`, `createdAt`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `CognitiveDiagnosticAssessment`
  ADD CONSTRAINT `CognitiveDiagnosticAssessment_patientId_fkey`
  FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `CognitiveDiagnosticAssessment`
  ADD CONSTRAINT `CognitiveDiagnosticAssessment_consultationId_patientId_fkey`
  FOREIGN KEY (`consultationId`, `patientId`) REFERENCES `Consultation`(`id`, `patientId`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `CognitiveDiagnosticAssessment`
  ADD CONSTRAINT `CognitiveDiagnosticAssessment_recordedById_fkey`
  FOREIGN KEY (`recordedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
