import { prisma } from "../lib/prisma";
import { notify } from "../lib/socket";
import { guardianUserIds } from "./access";

/**
 * Move students up a class once their end-of-year report's reopen date arrives.
 *
 * A promotion is pending when a TermReport has a `promotedToClassId`, a
 * `reopenDate` that is now in the past, and has not yet been applied. Each is
 * applied exactly once (guarded by `promotionAppliedAt`).
 */
export async function applyDuePromotions(now = new Date()): Promise<number> {
  const due = await prisma.termReport.findMany({
    where: {
      promotedToClassId: { not: null },
      promotionAppliedAt: null,
      reopenDate: { not: null, lte: now },
    },
    include: {
      student: { select: { id: true, firstName: true } },
      promotedToClass: { select: { name: true } },
    },
  });

  let applied = 0;
  for (const report of due) {
    await prisma.$transaction([
      prisma.student.update({
        where: { id: report.studentId },
        data: { classId: report.promotedToClassId },
      }),
      prisma.termReport.update({
        where: { id: report.id },
        data: { promotionAppliedAt: now },
      }),
    ]);
    applied++;

    const guardians = await guardianUserIds(report.studentId);
    await Promise.all(
      guardians.map((userId) =>
        notify({
          userId,
          type: "STUDENT_PROMOTED",
          title: `${report.student?.firstName ?? "Your child"} has moved up to ${report.promotedToClass?.name ?? "the next class"}`,
          data: { studentId: report.studentId },
        }),
      ),
    );
  }
  return applied;
}

/**
 * Run the sweep now and then on a fixed interval (default hourly). Returns the
 * timer so callers can clear it in tests.
 */
export function startPromotionScheduler(intervalMs = 60 * 60 * 1000) {
  const run = () =>
    applyDuePromotions().catch((err) => console.error("[promotions] sweep failed", err));
  run();
  return setInterval(run, intervalMs);
}
