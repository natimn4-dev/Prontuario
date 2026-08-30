-- VIDaaS application credentials are stored encrypted at rest.
-- The plaintext client_secret never belongs in source control or a browser payload.
CREATE TABLE `ExternalIntegrationCredential` (
    `id` VARCHAR(191) NOT NULL,
    `provider` VARCHAR(191) NOT NULL,
    `encryptedPayload` LONGTEXT NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ExternalIntegrationCredential_provider_key`(`provider`),
    INDEX `ExternalIntegrationCredential_createdById_createdAt_idx`(`createdById`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ExternalIntegrationCredential`
    ADD CONSTRAINT `ExternalIntegrationCredential_createdById_fkey`
    FOREIGN KEY (`createdById`) REFERENCES `User`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
