-- CreateTable
CREATE TABLE `Category` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `description` VARCHAR(300) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Category_name_key`(`name`),
    UNIQUE INDEX `Category_slug_key`(`slug`),
    INDEX `Category_isActive_sortOrder_idx`(`isActive`, `sortOrder`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Company` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(150) NOT NULL,
    `slug` VARCHAR(180) NOT NULL,
    `overview` VARCHAR(300) NULL,
    `industry` VARCHAR(100) NULL,
    `logo` VARCHAR(500) NULL,
    `website` VARCHAR(500) NULL,
    `officialEmail` VARCHAR(254) NULL,
    `location` VARCHAR(150) NULL,
    `verification` ENUM('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED') NOT NULL DEFAULT 'UNVERIFIED',
    `rating` DECIMAL(2, 1) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Company_slug_key`(`slug`),
    INDEX `Company_name_idx`(`name`),
    INDEX `Company_verification_idx`(`verification`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Job` (
    `id` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(180) NOT NULL,
    `title` VARCHAR(37) NOT NULL,
    `shortDescription` VARCHAR(500) NOT NULL,
    `role` VARCHAR(20) NOT NULL,
    `detailedTitle` VARCHAR(250) NOT NULL,
    `description` TEXT NOT NULL,
    `location` VARCHAR(150) NOT NULL,
    `employmentType` ENUM('FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP') NOT NULL,
    `experienceLevel` ENUM('FRESHER', 'EXPERIENCED') NOT NULL,
    `experienceYears` DECIMAL(4, 1) NULL,
    `salaryMin` DECIMAL(10, 2) NULL,
    `salaryMax` DECIMAL(10, 2) NULL,
    `salaryCurrency` VARCHAR(3) NOT NULL DEFAULT 'INR',
    `salaryPeriod` ENUM('MONTHLY', 'YEARLY', 'HOURLY', 'NOT_DISCLOSED') NOT NULL DEFAULT 'NOT_DISCLOSED',
    `qualifications` JSON NULL,
    `skills` JSON NULL,
    `experienceDetails` JSON NULL,
    `otherData` JSON NULL,
    `keywords` JSON NULL,
    `logo` VARCHAR(500) NULL,
    `rating` DECIMAL(2, 1) NULL,
    `metaTitle` VARCHAR(60) NULL,
    `metaDescription` VARCHAR(160) NULL,
    `canonicalUrl` VARCHAR(500) NULL,
    `ogTitle` VARCHAR(60) NULL,
    `ogDescription` VARCHAR(200) NULL,
    `ogImage` VARCHAR(500) NULL,
    `ogImageAlt` VARCHAR(125) NULL,
    `ogType` VARCHAR(30) NOT NULL DEFAULT 'website',
    `status` ENUM('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'EXPIRED', 'CLOSED') NOT NULL DEFAULT 'DRAFT',
    `applicationMethod` ENUM('INTERNAL', 'EXTERNAL', 'EMAIL') NOT NULL DEFAULT 'EXTERNAL',
    `applicationUrl` VARCHAR(1000) NULL,
    `applicationEmail` VARCHAR(254) NULL,
    `allowGuestApply` BOOLEAN NOT NULL DEFAULT true,
    `applicationCount` INTEGER NOT NULL DEFAULT 0,
    `applyClickCount` INTEGER NOT NULL DEFAULT 0,
    `publishedAt` DATETIME(3) NULL,
    `deadline` DATETIME(3) NULL,
    `closedAt` DATETIME(3) NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `categoryId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Job_slug_key`(`slug`),
    INDEX `Job_status_publishedAt_idx`(`status`, `publishedAt`),
    INDEX `Job_location_idx`(`location`),
    INDEX `Job_employmentType_idx`(`employmentType`),
    INDEX `Job_categoryId_idx`(`categoryId`),
    INDEX `Job_experienceLevel_experienceYears_idx`(`experienceLevel`, `experienceYears`),
    INDEX `Job_companyId_idx`(`companyId`),
    INDEX `Job_deadline_idx`(`deadline`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `Company`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_categoryId_fkey` FOREIGN KEY (`categoryId`) REFERENCES `Category`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
