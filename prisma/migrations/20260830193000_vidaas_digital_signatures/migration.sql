-- Persist immutable digital-signature artifacts without storing biometric data,
-- VIDaaS passwords, private keys, or long-lived authorization tokens.
CREATE TABLE `DigitalSignature` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `consultationId` VARCHAR(191) NOT NULL,
    `sourceSnapshotId` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL DEFAULT 'VIDAAS',
    `status` ENUM('PENDING', 'SIGNED', 'FAILED') NOT NULL DEFAULT 'PENDING',
    `unsignedPdfBase64` LONGTEXT NULL,
    `signedPdfBase64` LONGTEXT NULL,
    `unsignedSha256` VARCHAR(191) NOT NULL,
    `signedSha256` VARCHAR(191) NULL,
    `verificationTokenHash` VARCHAR(191) NOT NULL,
    `oauthStateHash` VARCHAR(191) NOT NULL,
    `signatureFormat` VARCHAR(191) NOT NULL DEFAULT 'PAdES_AD_RB',
    `certificateAlias` VARCHAR(191) NULL,
    `errorCode` VARCHAR(191) NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `signedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `DigitalSignature_verificationTokenHash_key`(`verificationTokenHash`),
    UNIQUE INDEX `DigitalSignature_oauthStateHash_key`(`oauthStateHash`),
    INDEX `DigitalSignature_consultationId_createdAt_idx`(`consultationId`, `createdAt`),
    INDEX `DigitalSignature_patientId_createdAt_idx`(`patientId`, `createdAt`),
    INDEX `DigitalSignature_sourceSnapshotId_idx`(`sourceSnapshotId`),
    INDEX `DigitalSignature_createdById_createdAt_idx`(`createdById`, `createdAt`),
    INDEX `DigitalSignature_status_expiresAt_idx`(`status`, `expiresAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `DigitalSignature`
    ADD CONSTRAINT `DigitalSignature_patientId_fkey`
    FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `DigitalSignature_consultationId_patientId_fkey`
    FOREIGN KEY (`consultationId`, `patientId`) REFERENCES `Consultation`(`id`, `patientId`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `DigitalSignature_sourceSnapshotId_fkey`
    FOREIGN KEY (`sourceSnapshotId`) REFERENCES `DocumentSnapshot`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `DigitalSignature_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
