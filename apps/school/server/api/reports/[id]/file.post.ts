import { Role } from "@repo/shared";
import type { TermReportDoc } from "../../../utils/firebase";

// Attach / replace a term report's PDF (or scanned image).
export default defineEventHandler(async (event) => {
  await requireUser(event, [Role.ADMIN, Role.TEACHER]);
  const id = getRouterParam(event, "id")!;
  const file = await readUploadedDocument(event);
  const fileUrl = await storageUrl(file);

  const ref = collections.termReports().doc(id);
  const existing = await ref.get();
  if (!existing.exists) throw httpError(404, "Report not found");
  await ref.update({ fileUrl });

  const updated = await ref.get();
  return { report: { id, ...(updated.data() as TermReportDoc) } };
});
