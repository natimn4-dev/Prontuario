-- CreateTable
CREATE TABLE `ClinicalExamRecord` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `consultationId` VARCHAR(191) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ClinicalExamRecord_consultationId_key`(`consultationId`),
    INDEX `ClinicalExamRecord_patientId_updatedAt_idx`(`patientId`, `updatedAt`),
    UNIQUE INDEX `ClinicalExamRecord_consultationId_patientId_key`(`consultationId`, `patientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ClinicalExamRecord` ADD CONSTRAINT `ClinicalExamRecord_patientId_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ClinicalExamRecord` ADD CONSTRAINT `ClinicalExamRecord_consultationId_patientId_fkey` FOREIGN KEY (`consultationId`, `patientId`) REFERENCES `Consultation`(`id`, `patientId`) ON DELETE RESTRICT ON UPDATE CASCADE;
