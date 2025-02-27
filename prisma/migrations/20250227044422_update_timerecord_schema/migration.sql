/*
  Warnings:

  - You are about to drop the column `breakEnd` on the `TimeRecord` table. All the data in the column will be lost.
  - You are about to drop the column `breakStart` on the `TimeRecord` table. All the data in the column will be lost.
  - You are about to drop the column `clockIn` on the `TimeRecord` table. All the data in the column will be lost.
  - You are about to drop the column `clockOut` on the `TimeRecord` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `TimeRecord` table. All the data in the column will be lost.
  - Added the required column `clockInTime` to the `TimeRecord` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `date` on the `TimeRecord` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "TimeRecord" DROP COLUMN "breakEnd",
DROP COLUMN "breakStart",
DROP COLUMN "clockIn",
DROP COLUMN "clockOut",
DROP COLUMN "updatedAt",
ADD COLUMN     "breakEndTime" VARCHAR(5),
ADD COLUMN     "breakStartTime" VARCHAR(5),
ADD COLUMN     "clockInTime" VARCHAR(5) NOT NULL,
ADD COLUMN     "clockOutTime" VARCHAR(5),
ADD COLUMN     "workingHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
DROP COLUMN "date",
ADD COLUMN     "date" VARCHAR(10) NOT NULL,
ALTER COLUMN "status" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "TimeRecord_date_idx" ON "TimeRecord"("date");

-- CreateIndex
CREATE UNIQUE INDEX "TimeRecord_userId_date_key" ON "TimeRecord"("userId", "date");
