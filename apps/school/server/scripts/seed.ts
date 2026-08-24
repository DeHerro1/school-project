// Seeds demo staff + parent accounts and sample data into the local dev
// setup: Firebase Auth Emulator (for accounts) + the local Node-only
// Firestore mock (for profiles/classes/subjects/students/...) — see
// server/utils/mockFirestore.ts. No Java, no Firestore emulator involved.
// Run with the Auth emulator already up:
//   pnpm firebase:emulators   (in one terminal)
//   pnpm firebase:seed        (in another)
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { MockFirestore } from "../utils/mockFirestore";
import { newId } from "../utils/id";

const __dirname = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(__dirname, "../../../../.env") });
loadEnv({ path: resolve(__dirname, "../../.env"), override: true });

if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error(
    "FIREBASE_AUTH_EMULATOR_HOST is not set — refusing to seed a real Firebase project.\n" +
      "Start the emulator first: pnpm firebase:emulators",
  );
  process.exit(1);
}

const app = initializeApp({
  projectId: process.env.FIREBASE_PROJECT_ID ?? "school-project-dev",
  // Omitted entirely (not just `undefined`) when there's no real project —
  // firebase-admin rejects an explicit `credential: undefined` key.
  ...(process.env.GOOGLE_APPLICATION_CREDENTIALS ? { credential: applicationDefault() } : {}),
});
const auth = getAuth(app);
// Shared with schools-backoffice's own mock fallback — see
// apps/school/server/utils/firebase.ts's comment on adminDb().
const db = new MockFirestore(resolve(__dirname, "../../../../.data/firestore.json"));

async function upsertAccount(opts: {
  email: string;
  username: string | null;
  password: string;
  name: string;
  role: "ADMIN" | "TEACHER" | "PARENT";
}) {
  let uid: string;
  try {
    const existing = await auth.getUserByEmail(opts.email);
    uid = existing.uid;
    await auth.updateUser(uid, { password: opts.password, displayName: opts.name });
  } catch {
    const created = await auth.createUser({
      email: opts.email,
      password: opts.password,
      displayName: opts.name,
      emailVerified: true,
    });
    uid = created.uid;
  }
  await db.collection("users").doc(uid).set({
    email: opts.email,
    username: opts.username,
    name: opts.name,
    role: opts.role,
    phone: null,
    avatarUrl: null,
    createdAt: new Date().toISOString(),
  });
  console.log(`  ${opts.role} ${opts.username ?? opts.email} -> ${uid}`);
  return uid;
}

/** A small inline SVG "photo" so the demo has something to show, no network. */
function photo(label: string, hue: number): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'>` +
    `<rect width='400' height='300' fill='hsl(${hue},70%,55%)'/>` +
    `<text x='50%' y='50%' fill='#fff' font-family='sans-serif' font-size='24' font-weight='bold' text-anchor='middle' dominant-baseline='middle'>${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

async function findOrCreate(
  colName: string,
  whereField: string,
  whereValue: string,
  data: Record<string, unknown>,
): Promise<string> {
  const col = db.collection(colName);
  const existing = await col.where(whereField, "==", whereValue).limit(1).get();
  if (!existing.empty) return existing.docs[0]!.id;
  const id = newId();
  await col.doc(id).set(data);
  return id;
}

async function main() {
  console.log("Seeding staff accounts (password: password123)...");
  await upsertAccount({
    email: "admin@school.test",
    username: "admin",
    password: "password123",
    name: "The Headmaster",
    role: "ADMIN",
  });
  const teacherId = await upsertAccount({
    email: "sarah@school.test",
    username: "sarah",
    password: "password123",
    name: "Sarah Mensah",
    role: "TEACHER",
  });

  console.log("Seeding a parent account...");
  const parentId = await upsertAccount({
    email: "mary@parent.test",
    username: null,
    password: "password123",
    name: "Mary Owusu",
    role: "PARENT",
  });

  console.log("Seeding a class and subjects...");
  // cuid-shaped ids (see server/utils/id.ts) — @repo/shared's Zod schemas
  // validate class/subject/student/invoice ids elsewhere with `.cuid()`.
  const classId = await findOrCreate("classes", "name", "Nursery A", {
    name: "Nursery A",
    level: "NURSERY",
    homeroomTeacherId: teacherId,
    studentCount: null,
    subjectsOffered: null,
    createdAt: new Date().toISOString(),
  });
  console.log(`  Nursery A -> ${classId} (homeroom: sarah)`);

  const subjectIds: string[] = [];
  for (const name of ["Numeracy", "Literacy", "Creative Arts"]) {
    const id = await findOrCreate("subjects", "name", name, { name, code: null, isActivity: false });
    subjectIds.push(id);
    console.log(`  Subject: ${name}`);
  }

  console.log("Seeding a demo student, linked to the parent account...");
  const studentId = await findOrCreate("students", "admissionNo", "ADM-2026-0001", {
    admissionNo: "ADM-2026-0001",
    firstName: "Ama",
    lastName: "Owusu",
    dob: new Date(2021, 3, 12).toISOString(),
    photoUrl: null,
    isFirstTime: true,
    classId,
    guardianName: "Mary Owusu",
    guardianPhone: "0244000000",
    secondaryGuardianName: null,
    secondaryGuardianPhone: null,
    address: "12 Palm Avenue, East Legon",
    createdAt: new Date().toISOString(),
  });
  const guardianships = db.collection("guardianships");
  const existingLink = await guardianships
    .where("parentUserId", "==", parentId)
    .where("studentId", "==", studentId)
    .limit(1)
    .get();
  if (existingLink.empty) {
    await guardianships.doc(newId()).set({ parentUserId: parentId, studentId, relation: "Mother" });
  }
  console.log(`  Ama Owusu -> ${studentId} (guardian: Mary Owusu)`);

  console.log("Seeding attendance, a photo, a progress update, a term report and an invoice...");
  // Matches server/api/attendance/index.post.ts's own convention exactly
  // (doc id `${studentId}_${date}`, date as a plain "YYYY-MM-DD" string) so
  // a teacher marking today's register doesn't create a second, divergent
  // attendance record for the same day.
  const todayDate = new Date().toISOString().slice(0, 10);
  await db.collection("attendance").doc(`${studentId}_${todayDate}`).set({
    studentId,
    date: todayDate,
    status: "PRESENT",
    markedById: teacherId,
    createdAt: new Date().toISOString(),
  });

  const mediaExists = await db.collection("media").where("studentId", "==", studentId).limit(1).get();
  if (mediaExists.empty) {
    await db.collection("media").doc(newId()).set({
      studentId,
      teacherId,
      fileUrl: photo("Art class", 200),
      caption: "Ama's first art class masterpiece!",
      createdAt: new Date().toISOString(),
    });
  }

  const progressExists = await db.collection("progress").where("studentId", "==", studentId).limit(1).get();
  if (progressExists.empty) {
    await db.collection("progress").doc(newId()).set({
      studentId,
      teacherId,
      term: "First Term",
      strengths: "Settled in well and enjoys group activities.",
      talents: "Shows a real talent for drawing and storytelling.",
      needs: "Could use more practice with number recognition.",
      howParentsCanHelp: "Count everyday objects together at home.",
      createdAt: new Date().toISOString(),
    });
  }

  const reportExists = await db.collection("termReports").where("studentId", "==", studentId).limit(1).get();
  if (reportExists.empty) {
    const reportId = newId();
    await db.collection("termReports").doc(reportId).set({
      studentId,
      term: "First Term",
      year: 2026,
      fileUrl: null,
      classId,
      promotedToClassId: null,
      reopenDate: null,
      promotionAppliedAt: null,
      positionInClass: "3rd out of 18",
      progress: "Settled in well and is actively participating in class.",
      interest: "Shows strong interest in Creative Arts.",
      strength: "Excellent attendance and a positive attitude.",
      howParentsCanHelp: "Read together for 15 minutes each evening.",
      createdAt: new Date().toISOString(),
    });
    const scores = [78, 85, 92];
    for (let i = 0; i < subjectIds.length; i++) {
      const score = scores[i] ?? 75;
      await db.collection("marks").doc(newId()).set({
        termReportId: reportId,
        subjectId: subjectIds[i],
        score,
        grade: score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : "D",
        comment: score >= 80 ? "Excellent" : "Good progress",
      });
    }
  }

  const invoiceExists = await db.collection("invoices").where("studentId", "==", studentId).limit(1).get();
  if (invoiceExists.empty) {
    const invoiceId = newId();
    await db.collection("invoices").doc(invoiceId).set({
      studentId,
      term: "First Term 2026",
      amount: 1500,
      dueDate: new Date(2026, 8, 30).toISOString(),
      status: "PARTIAL",
      createdAt: new Date().toISOString(),
    });
    await db.collection("payments").doc(newId()).set({
      invoiceId,
      amount: 700,
      method: "momo",
      createdAt: new Date().toISOString(),
    });
  }

  console.log("\nDone. Sign in at http://localhost:3000/login with:");
  console.log("  admin / password123              (headmaster)");
  console.log("  sarah / password123              (teacher, homeroom of Nursery A)");
  console.log("  mary@parent.test / password123    (parent of Ama Owusu)");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
