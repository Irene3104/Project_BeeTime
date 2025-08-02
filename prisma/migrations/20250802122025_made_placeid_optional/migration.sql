-- DropIndex
DROP INDEX "Location_placeId_key";

-- AlterTable
ALTER TABLE "Location" ALTER COLUMN "placeId" DROP NOT NULL;
