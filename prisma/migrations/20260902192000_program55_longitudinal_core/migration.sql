-- Programa 55+ longitudinal core.
-- Exclusively additive: creates new tables/indexes/FKs and does not alter existing clinical tables.

CREATE TABLE `Program55Enrollment` (
    `id` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `status` ENUM('ACTIVE', 'COMPLETED', 'ENDED') NOT NULL DEFAULT 'ACTIVE',
    `startedAt` DATETIME(3) NOT NULL,
    `endedAt` DATETIME(3) NULL,
    `coordinatingPhysicianId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Program55Enrollment_patientId_key`(`patientId`),
    INDEX `P55Enrollment_status_started_idx`(`status`, `startedAt`),
    INDEX `P55Enrollment_coordinator_idx`(`coordinatingPhysicianId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Program55Checkpoint` (
    `id` VARCHAR(191) NOT NULL,
    `enrollmentId` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `checkpointType` ENUM('BASELINE', 'DAY_90', 'DAY_180', 'YEAR_1', 'CUSTOM') NOT NULL,
    `referenceDate` DATETIME(3) NOT NULL,
    `status` ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED') NOT NULL DEFAULT 'NOT_STARTED',
    `coordinatingConsultationId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `P55Checkpoint_enrollment_type_date_key`(`enrollmentId`, `checkpointType`, `referenceDate`),
    INDEX `P55Checkpoint_patient_date_idx`(`patientId`, `referenceDate`),
    INDEX `P55Checkpoint_status_date_idx`(`status`, `referenceDate`),
    INDEX `P55Checkpoint_consultation_patient_idx`(`coordinatingConsultationId`, `patientId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Program55ProfessionalMembership` (
    `id` VARCHAR(191) NOT NULL,
    `enrollmentId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `discipline` ENUM('PHYSICIAN', 'PHYSIOTHERAPY', 'NUTRITION', 'PSYCHOLOGY') NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `P55Membership_enrollment_user_discipline_key`(`enrollmentId`, `userId`, `discipline`),
    INDEX `P55Membership_user_active_idx`(`userId`, `active`),
    INDEX `P55Membership_enrollment_discipline_active_idx`(`enrollmentId`, `discipline`, `active`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Program55BodyComposition` (
    `id` VARCHAR(191) NOT NULL,
    `checkpointId` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `measuredAt` DATETIME(3) NOT NULL,
    `weightKg` DECIMAL(7,2) NULL,
    `heightCm` DECIMAL(6,2) NULL,
    `bmi` DECIMAL(6,2) NULL,
    `waistCm` DECIMAL(6,2) NULL,
    `bodyFatPercent` DECIMAL(6,2) NULL,
    `fatMassKg` DECIMAL(7,2) NULL,
    `fatFreeMassKg` DECIMAL(7,2) NULL,
    `muscleMassKg` DECIMAL(7,2) NULL,
    `additionalMetrics` JSON NULL,
    `sourceLabel` VARCHAR(191) NULL,
    `deviceLabel` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `P55Body_checkpoint_measured_idx`(`checkpointId`, `measuredAt`),
    INDEX `P55Body_patient_measured_idx`(`patientId`, `measuredAt`),
    INDEX `P55Body_author_created_idx`(`createdById`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Program55ProfessionalAssessment` (
    `id` VARCHAR(191) NOT NULL,
    `checkpointId` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `discipline` ENUM('PHYSICIAN', 'PHYSIOTHERAPY', 'NUTRITION', 'PSYCHOLOGY') NOT NULL,
    `status` ENUM('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'REVIEWED') NOT NULL DEFAULT 'IN_PROGRESS',
    `structuredData` JSON NULL,
    `sharedSummary` TEXT NULL,
    `authorUserId` VARCHAR(191) NOT NULL,
    `assessedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `P55Assessment_checkpoint_discipline_key`(`checkpointId`, `discipline`),
    INDEX `P55Assessment_patient_assessed_idx`(`patientId`, `assessedAt`),
    INDEX `P55Assessment_author_assessed_idx`(`authorUserId`, `assessedAt`),
    INDEX `P55Assessment_discipline_status_idx`(`discipline`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Program55RestrictedPsychologyNote` (
    `id` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `authorUserId` VARCHAR(191) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `P55PsychNote_assessment_key`(`assessmentId`),
    INDEX `P55PsychNote_patient_created_idx`(`patientId`, `createdAt`),
    INDEX `P55PsychNote_author_created_idx`(`authorUserId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Program55Goal` (
    `id` VARCHAR(191) NOT NULL,
    `enrollmentId` VARCHAR(191) NOT NULL,
    `checkpointId` VARCHAR(191) NULL,
    `patientId` VARCHAR(191) NOT NULL,
    `domain` VARCHAR(191) NOT NULL,
    `objective` TEXT NOT NULL,
    `indicator` VARCHAR(191) NULL,
    `baselineValue` VARCHAR(191) NULL,
    `targetValue` VARCHAR(191) NULL,
    `dueDate` DATETIME(3) NULL,
    `status` ENUM('ACTIVE', 'ACHIEVED', 'PAUSED', 'CANCELLED') NOT NULL DEFAULT 'ACTIVE',
    `responsibleDiscipline` ENUM('PHYSICIAN', 'PHYSIOTHERAPY', 'NUTRITION', 'PSYCHOLOGY') NULL,
    `notes` TEXT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `P55Goal_enrollment_status_due_idx`(`enrollmentId`, `status`, `dueDate`),
    INDEX `P55Goal_patient_created_idx`(`patientId`, `createdAt`),
    INDEX `P55Goal_checkpoint_idx`(`checkpointId`),
    INDEX `P55Goal_author_created_idx`(`createdById`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Program55Enrollment`
    ADD CONSTRAINT `P55Enrollment_patient_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `P55Enrollment_coordinator_fkey` FOREIGN KEY (`coordinatingPhysicianId`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE `Program55Checkpoint`
    ADD CONSTRAINT `P55Checkpoint_enrollment_fkey` FOREIGN KEY (`enrollmentId`) REFERENCES `Program55Enrollment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `P55Checkpoint_patient_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `P55Checkpoint_consultation_fkey` FOREIGN KEY (`coordinatingConsultationId`, `patientId`) REFERENCES `Consultation`(`id`, `patientId`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Program55ProfessionalMembership`
    ADD CONSTRAINT `P55Membership_enrollment_fkey` FOREIGN KEY (`enrollmentId`) REFERENCES `Program55Enrollment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `P55Membership_user_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Program55BodyComposition`
    ADD CONSTRAINT `P55Body_checkpoint_fkey` FOREIGN KEY (`checkpointId`) REFERENCES `Program55Checkpoint`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `P55Body_patient_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `P55Body_author_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Program55ProfessionalAssessment`
    ADD CONSTRAINT `P55Assessment_checkpoint_fkey` FOREIGN KEY (`checkpointId`) REFERENCES `Program55Checkpoint`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `P55Assessment_patient_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `P55Assessment_author_fkey` FOREIGN KEY (`authorUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Program55RestrictedPsychologyNote`
    ADD CONSTRAINT `P55PsychNote_assessment_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `Program55ProfessionalAssessment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `P55PsychNote_patient_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `P55PsychNote_author_fkey` FOREIGN KEY (`authorUserId`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `Program55Goal`
    ADD CONSTRAINT `P55Goal_enrollment_fkey` FOREIGN KEY (`enrollmentId`) REFERENCES `Program55Enrollment`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `P55Goal_checkpoint_fkey` FOREIGN KEY (`checkpointId`) REFERENCES `Program55Checkpoint`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `P55Goal_patient_fkey` FOREIGN KEY (`patientId`) REFERENCES `Patient`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT `P55Goal_author_fkey` FOREIGN KEY (`createdById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
