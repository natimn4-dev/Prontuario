-- Multiprofessional user access and patient scoping.
-- Additive only: no clinical record is removed or rewritten.

ALTER TABLE `User`
    ADD COLUMN `professionalRole` ENUM('MEDICO', 'FISIOTERAPEUTA', 'NUTRICIONISTA', 'PSICOLOGO', 'FONOAUDIOLOGO') NOT NULL DEFAULT 'MEDICO',
    ADD COLUMN `patientAccessScope` ENUM('ALL_PATIENTS', 'ASSIGNED_PATIENTS') NOT NULL DEFAULT 'ALL_PATIENTS',
    ADD COLUMN `canManageUsers` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `accessManaged` BOOLEAN NOT NULL DEFAULT false;

-- Preserve existing administrators as user managers. Existing physicians remain
-- authorized through the production legacy fingerprints until explicitly managed.
UPDATE `User`
SET `canManageUsers` = true,
    `accessManaged` = true
WHERE `role` = 'ADMIN';

CREATE TABLE `UserAccessGrant` (
    `id` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NULL,
    `professionalRole` ENUM('MEDICO', 'FISIOTERAPEUTA', 'NUTRICIONISTA', 'PSICOLOGO', 'FONOAUDIOLOGO') NOT NULL,
    `patientAccessScope` ENUM('ALL_PATIENTS', 'ASSIGNED_PATIENTS') NOT NULL DEFAULT 'ASSIGNED_PATIENTS',
    `canManageUsers` BOOLEAN NOT NULL DEFAULT false,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `acceptedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `UserAccessGrant_email_key`(`email`),
    INDEX `UserAccessGrant_active_created_idx`(`active`, `createdAt`),
    INDEX `UserAccessGrant_creator_idx`(`createdByUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `PatientUserAssignment` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `assignedByUserId` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PatientUserAssignment_user_patient_key`(`userId`, `patientId`),
    INDEX `PatientUserAssignment_user_active_idx`(`userId`, `active`),
    INDEX `PatientUserAssignment_patient_active_idx`(`patientId`, `active`),
    INDEX `PatientUserAssignment_creator_idx`(`assignedByUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `UserAccessGrant`
    ADD CONSTRAINT `UserAccessGrant_creator_fkey` FOREIGN KEY (`createdByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `PatientUserAssignment`
    ADD CONSTRAINT `PatientUserAssignment_user_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `PatientUserAssignment_patient_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `PatientUserAssignment_creator_fkey` FOREIGN KEY (`assignedByUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
