-- CreateTable
CREATE TABLE `OtpRateLimit` (
    `id` VARCHAR(191) NOT NULL,
    `key` VARCHAR(255) NOT NULL,
    `hits` INTEGER NOT NULL DEFAULT 0,
    `windowStart` DATETIME(3) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `OtpRateLimit_key_key`(`key`),
    INDEX `OtpRateLimit_windowStart_idx`(`windowStart`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
