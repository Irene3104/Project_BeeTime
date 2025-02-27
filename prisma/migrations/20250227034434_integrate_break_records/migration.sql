/*
  Warnings:

  - You are about to drop the `BreakRecord` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "BreakRecord" DROP CONSTRAINT "BreakRecord_timeRecordId_fkey";

-- AlterTable
ALTER TABLE "TimeRecord" ADD COLUMN     "breakEnd" TIMESTAMP(6),
ADD COLUMN     "breakMinutes" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "breakStart" TIMESTAMP(6);

-- DropTable
DROP TABLE "BreakRecord";
