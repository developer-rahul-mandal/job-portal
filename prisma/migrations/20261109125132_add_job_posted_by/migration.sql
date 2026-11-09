/*
  Warnings:

  - Added the required column `postedById` to the `Job` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `job` ADD COLUMN `postedById` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE INDEX `Job_postedById_idx` ON `Job`(`postedById`);

-- AddForeignKey
ALTER TABLE `Job` ADD CONSTRAINT `Job_postedById_fkey` FOREIGN KEY (`postedById`) REFERENCES `User`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
