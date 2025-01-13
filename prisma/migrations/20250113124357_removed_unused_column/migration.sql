/*
  Warnings:

  - You are about to drop the column `disabled` on the `Area` table. All the data in the column will be lost.
  - You are about to drop the column `disabled` on the `PointOfInterest` table. All the data in the column will be lost.
  - You are about to drop the column `disabled` on the `Task` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Area" DROP COLUMN "disabled";

-- AlterTable
ALTER TABLE "PointOfInterest" DROP COLUMN "disabled";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "disabled";
