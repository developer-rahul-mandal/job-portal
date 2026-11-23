-- AlterTable
ALTER TABLE `company` ADD COLUMN `normalizedDomain` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `companyrecruiter` ADD COLUMN `rejectedAt` DATETIME(3) NULL,
    ADD COLUMN `rejectionReason` VARCHAR(500) NULL,
    ADD COLUMN `reviewedById` VARCHAR(191) NULL,
    ADD COLUMN `verificationStatus` ENUM('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'UNVERIFIED',
    ADD COLUMN `verifiedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `job` ADD COLUMN `rejectionReason` VARCHAR(500) NULL;

-- CreateTable
CREATE TABLE `CompanyJoinRequest` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `notes` VARCHAR(500) NULL,
    `reviewedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CompanyJoinRequest_companyId_status_idx`(`companyId`, `status`),
    INDEX `CompanyJoinRequest_userId_status_idx`(`userId`, `status`),
    UNIQUE INDEX `CompanyJoinRequest_companyId_userId_status_key`(`companyId`, `userId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyInvitation` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `email` VARCHAR(254) NOT NULL,
    `role` ENUM('OWNER', 'ADMIN', 'RECRUITER') NOT NULL DEFAULT 'RECRUITER',
    `token` VARCHAR(128) NOT NULL,
    `status` ENUM('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'REVOKED') NOT NULL DEFAULT 'PENDING',
    `invitedById` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `acceptedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CompanyInvitation_token_key`(`token`),
    INDEX `CompanyInvitation_companyId_status_idx`(`companyId`, `status`),
    INDEX `CompanyInvitation_email_status_idx`(`email`, `status`),
    INDEX `CompanyInvitation_token_idx`(`token`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyVerificationHistory` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `previousStatus` ENUM('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED') NULL,
    `newStatus` ENUM('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED') NOT NULL,
    `reviewedById` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CompanyVerificationHistory_companyId_createdAt_idx`(`companyId`, `createdAt`),
    INDEX `CompanyVerificationHistory_reviewedById_idx`(`reviewedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompanyRecruiterVerificationHistory` (
    `id` VARCHAR(191) NOT NULL,
    `recruiterId` VARCHAR(191) NOT NULL,
    `previousStatus` ENUM('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED') NULL,
    `newStatus` ENUM('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED') NOT NULL,
    `reviewedById` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `CompanyRecruiterVerificationHistory_recruiterId_createdAt_idx`(`recruiterId`, `createdAt`),
    INDEX `CompanyRecruiterVerificationHistory_reviewedById_idx`(`reviewedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `JobModerationHistory` (
    `id` VARCHAR(191) NOT NULL,
    `jobId` VARCHAR(191) NOT NULL,
    `previousStatus` ENUM('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'EXPIRED', 'CLOSED') NULL,
    `newStatus` ENUM('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'EXPIRED', 'CLOSED') NOT NULL,
    `reviewedById` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `JobModerationHistory_jobId_createdAt_idx`(`jobId`, `createdAt`),
    INDEX `JobModerationHistory_reviewedById_idx`(`reviewedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `Company_normalizedDomain_idx` ON `Company`(`normalizedDomain`);

-- CreateIndex
CREATE INDEX `CompanyRecruiter_companyId_verificationStatus_idx` ON `CompanyRecruiter`(`companyId`, `verificationStatus`);

-- CreateIndex
CREATE INDEX `CompanyRecruiter_userId_verificationStatus_idx` ON `CompanyRecruiter`(`userId`, `verificationStatus`);

-- CreateIndex
CREATE INDEX `CompanyRecruiter_reviewedById_idx` ON `CompanyRecruiter`(`reviewedById`);

-- AddForeignKey
ALTER TABLE `CompanyRecruiter` ADD CONSTRAINT `CompanyRecruiter_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyJoinRequest` ADD CONSTRAINT `CompanyJoinRequest_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyJoinRequest` ADD CONSTRAINT `CompanyJoinRequest_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyInvitation` ADD CONSTRAINT `CompanyInvitation_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyInvitation` ADD CONSTRAINT `CompanyInvitation_invitedById_fkey` FOREIGN KEY (`invitedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyVerificationHistory` ADD CONSTRAINT `CompanyVerificationHistory_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyVerificationHistory` ADD CONSTRAINT `CompanyVerificationHistory_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyRecruiterVerificationHistory` ADD CONSTRAINT `CompanyRecruiterVerificationHistory_recruiterId_fkey` FOREIGN KEY (`recruiterId`) REFERENCES `CompanyRecruiter`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompanyRecruiterVerificationHistory` ADD CONSTRAINT `CompanyRecruiterVerificationHistory_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JobModerationHistory` ADD CONSTRAINT `JobModerationHistory_jobId_fkey` FOREIGN KEY (`jobId`) REFERENCES `Job`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `JobModerationHistory` ADD CONSTRAINT `JobModerationHistory_reviewedById_fkey` FOREIGN KEY (`reviewedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
