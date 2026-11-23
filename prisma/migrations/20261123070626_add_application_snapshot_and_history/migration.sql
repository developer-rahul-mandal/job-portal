-- AlterTable
ALTER TABLE `application` ADD COLUMN `resumeFileName` VARCHAR(255) NULL,
    ADD COLUMN `resumeFileSize` INTEGER NULL,
    ADD COLUMN `resumeMimeType` VARCHAR(100) NULL,
    ADD COLUMN `resumeStorageKey` VARCHAR(500) NULL;

-- CreateTable
CREATE TABLE `ApplicationStatusHistory` (
    `id` VARCHAR(191) NOT NULL,
    `applicationId` VARCHAR(191) NOT NULL,
    `previousStatus` ENUM('SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'HIRED', 'WITHDRAWN') NULL,
    `newStatus` ENUM('SUBMITTED', 'UNDER_REVIEW', 'SHORTLISTED', 'REJECTED', 'HIRED', 'WITHDRAWN') NOT NULL,
    `changedById` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ApplicationStatusHistory_applicationId_createdAt_idx`(`applicationId`, `createdAt`),
    INDEX `ApplicationStatusHistory_changedById_idx`(`changedById`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ApplicationStatusHistory` ADD CONSTRAINT `ApplicationStatusHistory_applicationId_fkey` FOREIGN KEY (`applicationId`) REFERENCES `Application`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ApplicationStatusHistory` ADD CONSTRAINT `ApplicationStatusHistory_changedById_fkey` FOREIGN KEY (`changedById`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
