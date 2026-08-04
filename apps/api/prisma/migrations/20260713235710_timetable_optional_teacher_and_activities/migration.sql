-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "isActivity" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Timetable" ALTER COLUMN "teacherId" DROP NOT NULL;
