/*
  Warnings:

  - Added the required column `polygon` to the `SubCampaign` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SubCampaign" ADD COLUMN     "polygon" JSONB NOT NULL;
