/*
  Warnings:

  - You are about to drop the `storage_provider_configs` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "storage_provider_configs" DROP CONSTRAINT "storage_provider_configs_organizationId_fkey";

-- DropTable
DROP TABLE "storage_provider_configs";
