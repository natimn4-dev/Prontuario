-- CreateTable
-- Histórico explícito criado vazio: não há backfill a partir de Medication.status.
CREATE TABLE `MedicationStatusEvent` (
    `id` VARCHAR(191) NOT NULL,
    `medicationId` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `consultationId` VARCHAR(191) NOT NULL,
    `previousStatus` ENUM('ACTIVE', 'SUSPENDED', 'FINISHED') NULL,
    `newStatus` ENUM('ACTIVE', 'SUSPENDED', 'FINISHED') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `MedicationStatusEvent_medicationId_patientId_createdAt_idx`(`medicationId`, `patientId`, `createdAt`),
    INDEX `MedicationStatusEvent_consultationId_patientId_idx`(`consultationId`, `patientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MedicationStatusEvent`
ADD CONSTRAINT `MedicationStatusEvent_medicationId_patientId_fkey`
FOREIGN KEY (`medicationId`, `patientId`) REFERENCES `Medication`(`id`, `patientId`)
ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `MedicationStatusEvent`
ADD CONSTRAINT `MedicationStatusEvent_consultationId_patientId_fkey`
FOREIGN KEY (`consultationId`, `patientId`) REFERENCES `Consultation`(`id`, `patientId`)
ON DELETE RESTRICT ON UPDATE CASCADE;
