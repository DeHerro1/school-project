import { Router } from "express";
import { respondAlertSchema, Role, AlertStatus, SocketEvents } from "@repo/shared";
import { prisma } from "../lib/prisma";
import { authGuard } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler, AppError } from "../middleware/error";
import { assertParentOwnsStudent } from "../services/access";
import { notify, emitTo } from "../lib/socket";

export const alertsRouter = Router();

// List alerts. Parents see alerts for their children; staff see recent alerts.
alertsRouter.get(
  "/",
  authGuard(),
  asyncHandler(async (req, res) => {
    const isParent = req.user!.role === Role.PARENT;
    const alerts = await prisma.absenceAlert.findMany({
      where: isParent
        ? { attendance: { student: { guardianships: { some: { parentUserId: req.user!.sub } } } } }
        : undefined,
      include: {
        attendance: {
          include: {
            student: { select: { id: true, firstName: true, lastName: true, photoUrl: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json({ alerts });
  }),
);

// Parent responds with the reason for the absence
alertsRouter.post(
  "/:id/respond",
  authGuard([Role.PARENT]),
  validate(respondAlertSchema),
  asyncHandler(async (req, res) => {
    const alert = await prisma.absenceAlert.findUnique({
      where: { id: req.params.id },
      include: { attendance: { include: { student: true } } },
    });
    if (!alert) throw new AppError(404, "Alert not found");
    await assertParentOwnsStudent(req.user!.sub, alert.attendance.studentId);
    if (alert.status === AlertStatus.RESPONDED) {
      throw new AppError(409, "You have already responded to this alert");
    }

    const updated = await prisma.absenceAlert.update({
      where: { id: alert.id },
      data: {
        parentReason: req.body.parentReason,
        status: AlertStatus.RESPONDED,
        respondedAt: new Date(),
      },
    });

    // Notify the teacher who marked the attendance
    const teacherId = alert.attendance.markedById;
    const student = alert.attendance.student;
    await notify({
      userId: teacherId,
      type: "ALERT_RESPONDED",
      title: `Reason provided for ${student.firstName}'s absence`,
      body: req.body.parentReason,
      data: { alertId: alert.id, studentId: student.id },
    });
    emitTo(teacherId, SocketEvents.ALERT_RESPONDED, {
      alertId: alert.id,
      studentId: student.id,
      parentReason: req.body.parentReason,
    });

    res.json({ alert: updated });
  }),
);
