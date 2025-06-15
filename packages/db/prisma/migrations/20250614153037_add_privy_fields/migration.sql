/*
  Warnings:

  - A unique constraint covering the columns `[privyUserId]` on the table `User` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `privyUserId` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "privyUserId" TEXT NOT NULL,
ADD COLUMN     "walletAddress" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_privyUserId_key" ON "User"("privyUserId");
