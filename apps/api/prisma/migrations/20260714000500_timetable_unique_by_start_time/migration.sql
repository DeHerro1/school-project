-- DropIndex
DROP INDEX "Timetable_classId_day_period_key";

-- CreateIndex
CREATE UNIQUE INDEX "Timetable_classId_day_startTime_key" ON "Timetable"("classId", "day", "startTime");
