import { createMediaShareSchema, Role } from "@repo/shared";
import type { MediaDoc, StudentDoc } from "../../utils/firebase";

// A teacher (or admin) captures a photo and shares it with the student's parents.
export default defineEventHandler(async (event) => {
  const user = await requireUser(event, [Role.ADMIN, Role.TEACHER]);
  const { file, fields } = await readUploadedImageWithFields(event, ["studentId", "caption"]);
  const body = parseOrThrow(createMediaShareSchema, {
    studentId: fields.studentId,
    caption: fields.caption || undefined,
  });
  await assertStudentInSchool(body.studentId, user.schoolId);

  const fileUrl = await storageUrl(file);
  const doc: MediaDoc = {
    studentId: body.studentId,
    teacherId: user.id,
    fileUrl,
    caption: body.caption ?? null,
    createdAt: new Date().toISOString(),
  };
  const id = newId();
  await collections.media().doc(id).set(doc);

  const studentSnap = await collections.students().doc(body.studentId).get();
  const student = studentSnap.exists ? (studentSnap.data() as StudentDoc) : null;
  const guardians = await guardianUserIds(body.studentId);
  await Promise.all(
    guardians.map((userId) =>
      notify({
        userId,
        type: "MEDIA_SHARED",
        title: `New photo of ${student?.firstName ?? "your child"}`,
        body: doc.caption ?? undefined,
        data: { studentId: body.studentId, mediaId: id },
      }),
    ),
  );

  setResponseStatus(event, 201);
  return { media: { id, ...doc } };
});
