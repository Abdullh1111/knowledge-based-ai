/*
  Warnings:

  - Added the required column `content` to the `Files` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Files" ADD COLUMN     "content" TEXT NOT NULL;
