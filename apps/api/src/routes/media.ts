import { Router } from "express";
import { createMediaShareSchema, Role, SocketEvents } from "@repo/shared";
import { prisma } from "../lib/prisma";
import { authGuard } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { asyncHandler, AppError } from "../middleware/error";
import { uploadImage, storageUrl } from "../lib/upload";
import { assertParentOwnsStudent, guardianUserIds } from "../services/access";
import { notify, emitTo } from "../lib/socket";

export const mediaRouter = Router();

// Photo feed for a student (parents scoped to their children)
mediaRouter.get(
  "/",
  authGuard(),
  asyncHandler(async (req, res) => {
    const studentId = req.query.studentId as string;
    if (!studentId) throw new AppError(400, "studentId is required");
    if (req.user!.role === Role.PARENT) {
      await assertParentOwnsStudent(req.user!.sub, studentId);
    }
    const media = await prisma.mediaShare.findMany({
      where: { studentId },
      include: { teacher: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json({ media });
  }),
);

// Teacher captures a photo and shares it with the student's parents
mediaRouter.post(
  "/",
  authGuard([Role.ADMIN, Role.TEACHER]),
  uploadImage.single("file"),
  validate(createMediaShareSchema),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new AppError(400, "No image uploaded");
    const { studentId, caption } = req.body;
    const fileUrl = await storageUrl(req.file);

    const share = await prisma.mediaShare.create({
      data: {
        studentId,
        teacherId: req.user!.sub,
        fileUrl,
        caption,
      },
    });

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { firstName: true, lastName: true },
    });
    const guardians = await guardianUserIds(studentId);
    await Promise.all(
      guardians.map((userId) =>
        notify({
          userId,
          type: "MEDIA_SHARED",
          title: `New photo of ${student?.firstName ?? "your child"}`,
          body: caption,
          data: { studentId, mediaId: share.id },
        }),
      ),
    );
    guardians.forEach((userId) =>
      emitTo(userId, SocketEvents.MEDIA_SHARED, { studentId, media: share }),
    );

    res.status(201).json({ media: share });
  }),
);

mediaRouter.delete(
  "/:id",
  authGuard([Role.ADMIN, Role.TEACHER]),
  asyncHandler(async (req, res) => {
    await prisma.mediaShare.delete({ where: { id: req.params.id } });
    res.status(204).end();
  }),
);
