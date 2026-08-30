CREATE TABLE `AdvanceDirectiveRecord` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `consultationId` VARCHAR(191) NOT NULL,
    `recordedById` VARCHAR(191) NOT NULL,
    `version` INTEGER NOT NULL,
    `protocolVersion` VARCHAR(191) NOT NULL,
    `disposition` VARCHAR(191) NOT NULL,
    `participationMode` VARCHAR(191) NULL,
    `trustedPersonName` VARCHAR(191) NULL,
    `trustedRelation` VARCHAR(191) NULL,
    `trustedContact` VARCHAR(191) NULL,
    `whatMatters` TEXT NULL,
    `dignityAndComfort` TEXT NULL,
    `priorities` JSON NOT NULL,
    `topics` JSON NOT NULL,
    `documentStatus` VARCHAR(191) NOT NULL,
    `reviewTrigger` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `AdvanceDirectiveRecord_consultationId_version_key`(`consultationId`, `version`),
    INDEX `AdvanceDirectiveRecord_patientId_createdAt_idx`(`patientId`, `createdAt`),
    INDEX `AdvanceDirectiveRecord_recordedById_createdAt_idx`(`recordedById`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `AdvanceDirectiveRecord`
    ADD CONSTRAINT `AdvanceDirectiveRecord_patientId_fkey`
    FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `AdvanceDirectiveRecord`
    ADD CONSTRAINT `AdvanceDirectiveRecord_consultationId_patientId_fkey`
    FOREIGN KEY (`consultationId`, `patientId`) REFERENCES `Consultation`(`id`, `patientId`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `AdvanceDirectiveRecord`
    ADD CONSTRAINT `AdvanceDirectiveRecord_recordedById_fkey`
    FOREIGN KEY (`recordedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
