-- AlterTable
ALTER TABLE "public"."Project" ADD COLUMN     "state" JSONB DEFAULT '{"files":[],"directories":[]}';
