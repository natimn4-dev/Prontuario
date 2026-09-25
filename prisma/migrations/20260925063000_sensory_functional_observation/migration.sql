CREATE TABLE `SensoryFunctionalObservation` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `consultationId` VARCHAR(191) NOT NULL,
    `assessmentStatus` VARCHAR(191) NOT NULL DEFAULT 'NOT_ASSESSED',
    `multisensoryDysfunction` BOOLEAN NOT NULL DEFAULT false,
    `usesCorrectiveLenses` BOOLEAN NOT NULL DEFAULT false,
    `protocolVersion` VARCHAR(191) NOT NULL DEFAULT 'sensory-functional-observation-v1',
    `revision` INTEGER NOT NULL DEFAULT 1,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `sensory_obs_consult_patient_revision_uq`(`consultationId`, `patientId`, `revision`),
    INDEX `sensory_obs_patient_consult_idx`(`patientId`, `consultationId`),
    PRIMARY KEY (`id`),
    CONSTRAINT `sensory_obs_patient_fk`
      FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT `sensory_obs_consult_patient_fk`
      FOREIGN KEY (`consultationId`, `patientId`) REFERENCES `Consultation`(`id`, `patientId`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
