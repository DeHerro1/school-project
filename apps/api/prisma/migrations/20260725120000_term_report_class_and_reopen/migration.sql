-- AlterTable
ALTER TABLE "TermReport" ADD COLUMN     "classId" TEXT,
ADD COLUMN     "reopenDate" TIMESTAMP(3),
ADD COLUMN     "promotionAppliedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "TermReport" ADD CONSTRAINT "TermReport_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;
