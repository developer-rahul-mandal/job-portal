-- CreateTable
CREATE TABLE `SkillSuggestion` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `normalized` VARCHAR(191) NOT NULL,
    `suggestedBy` VARCHAR(191) NOT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `SkillSuggestion_name_key`(`name`),
    UNIQUE INDEX `SkillSuggestion_normalized_key`(`normalized`),
    INDEX `SkillSuggestion_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SkillSuggestion` ADD CONSTRAINT `SkillSuggestion_suggestedBy_fkey` FOREIGN KEY (`suggestedBy`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
