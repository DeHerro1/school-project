-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "studentCount" INTEGER,
ADD COLUMN     "subjectsOffered" TEXT;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "address" TEXT,
ADD COLUMN     "guardianName" TEXT,
ADD COLUMN     "guardianPhone" TEXT,
ADD COLUMN     "secondaryGuardianName" TEXT,
ADD COLUMN     "secondaryGuardianPhone" TEXT;
