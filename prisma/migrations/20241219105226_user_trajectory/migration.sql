/*
  Warnings:

  - You are about to drop the column `coordinateId` on the `DataEntry` table. All the data in the column will be lost.
  - You are about to drop the `Coordinate` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `GeoLocation` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Coordinate" DROP CONSTRAINT "Coordinate_geoLocationId_fkey";

-- DropForeignKey
ALTER TABLE "DataEntry" DROP CONSTRAINT "DataEntry_coordinateId_fkey";

-- DropForeignKey
ALTER TABLE "GeoLocation" DROP CONSTRAINT "GeoLocation_taskId_fkey";

-- DropIndex
DROP INDEX "DataEntry_coordinateId_key";

-- AlterTable
ALTER TABLE "DataEntry" DROP COLUMN "coordinateId";

-- AlterTable
ALTER TABLE "Task" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- DropTable
DROP TABLE "Coordinate";

-- DropTable
DROP TABLE "GeoLocation";

-- CreateTable
CREATE TABLE "UserTrajectory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserTrajectory_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "UserTrajectory" ADD CONSTRAINT "UserTrajectory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
