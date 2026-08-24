/** Generate a unique admission number (e.g. ADM-2026-4821). */
export async function generateAdmissionNo(): Promise<string> {
  const year = new Date().getFullYear();
  for (let i = 0; i < 5; i++) {
    const candidate = `ADM-${year}-${Math.floor(1000 + Math.random() * 9000)}`;
    const exists = await collections.students().where("admissionNo", "==", candidate).limit(1).get();
    if (exists.empty) return candidate;
  }
  return `ADM-${year}-${Date.now()}`;
}
