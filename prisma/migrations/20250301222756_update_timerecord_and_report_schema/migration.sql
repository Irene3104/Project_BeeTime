/*
  Warnings:

  - You are about to drop the column `breakEndTime` on the `TimeRecord` table. All the data in the column will be lost.
  - You are about to drop the column `breakStartTime` on the `TimeRecord` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TimeRecord" DROP COLUMN "breakEndTime",
DROP COLUMN "breakStartTime",
ADD COLUMN     "breakEndTime1" VARCHAR(5),
ADD COLUMN     "breakEndTime2" VARCHAR(5),
ADD COLUMN     "breakEndTime3" VARCHAR(5),
ADD COLUMN     "breakStartTime1" VARCHAR(5),
ADD COLUMN     "breakStartTime2" VARCHAR(5),
ADD COLUMN     "breakStartTime3" VARCHAR(5),
ALTER COLUMN "clockInTime" DROP NOT NULL;
