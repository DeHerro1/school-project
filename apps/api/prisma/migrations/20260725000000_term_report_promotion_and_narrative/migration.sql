-- AlterTable
ALTER TABLE "TermReport" ADD COLUMN     "promotedToClassId" TEXT,
ADD COLUMN     "positionInClass" TEXT,
ADD COLUMN     "progress" TEXT,
ADD COLUMN     "interest" TEXT,
ADD COLUMN     "strength" TEXT,
ADD COLUMN     "howParentsCanHelp" TEXT;

-- AddForeignKey
ALTER TABLE "TermReport" ADD CONSTRAINT "TermReport_promotedToClassId_fkey" FOREIGN KEY ("promotedToClassId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
