// One-off seed for a specific real account on the real (production) Firebase
// project — populates every page's data for the school that
// awalmohammedrabiu0@gmail.com administers. Unlike seed.ts (which refuses to
// run against anything but the local Auth emulator), this connects straight
// to Firebase Auth + Firestore for project clone-2033c using the checked-in
// service-account.json. Safe to re-run — everything is looked up by a
// natural key first (findOrCreate) so it won't duplicate.
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { newId } from "../utils/id";

const __dirname = dirname(fileURLToPath(import.meta.url));
process.env.GOOGLE_APPLICATION_CREDENTIALS = resolve(__dirname, "../../service-account.json");

const app = initializeApp({ credential: applicationDefault(), projectId: "clone-2033c" });
const auth = getAuth(app);
const db = getFirestore(app);

const TARGET_ADMIN_EMAIL = "awalmohammedrabiu0@gmail.com";
const PASSWORD = "password123";

async function upsertAccount(opts: {
  email: string;
  username: string | null;
  name: string;
  role: "TEACHER" | "PARENT";
  schoolId: string;
  phone?: string | null;
}) {
  let uid: string;
  try {
    const existing = await auth.getUserByEmail(opts.email);
    uid = existing.uid;
  } catch {
    const created = await auth.createUser({
      email: opts.email,
      password: PASSWORD,
      displayName: opts.name,
      emailVerified: true,
    });
    uid = created.uid;
  }
  const userDoc = db.collection("users").doc(uid);
  const snap = await userDoc.get();
  if (!snap.exists) {
    await userDoc.set({
      email: opts.email,
      username: opts.username,
      name: opts.name,
      role: opts.role,
      phone: opts.phone ?? null,
      avatarUrl: null,
      createdAt: new Date().toISOString(),
      schoolId: opts.schoolId,
    });
  }
  console.log(`  ${opts.role} ${opts.username ?? opts.email} -> ${uid}`);
  return uid;
}

function photo(label: string, hue: number): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'>` +
    `<rect width='400' height='300' fill='hsl(${hue},70%,55%)'/>` +
    `<text x='50%' y='50%' fill='#fff' font-family='sans-serif' font-size='24' font-weight='bold' text-anchor='middle' dominant-baseline='middle'>${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
function dateOnlyDaysAgo(n: number): string {
  return isoDaysAgo(n).slice(0, 10);
}

async function ensure(colName: string, whereField: string, whereValue: string, data: Record<string, unknown>) {
  const col = db.collection(colName);
  const existing = await col.where(whereField, "==", whereValue).limit(1).get();
  if (!existing.empty) return existing.docs[0]!.id;
  const id = newId();
  await col.doc(id).set(data);
  return id;
}

async function main() {
  console.log(`Looking up admin account ${TARGET_ADMIN_EMAIL}...`);
  const adminAuthUser = await auth.getUserByEmail(TARGET_ADMIN_EMAIL);
  const adminUserSnap = await db.collection("users").doc(adminAuthUser.uid).get();
  if (!adminUserSnap.exists) throw new Error("No Firestore users/ doc for this admin — sign up first.");
  const adminData = adminUserSnap.data() as { schoolId: string; name: string };
  const schoolId = adminData.schoolId;
  console.log(`  admin uid=${adminAuthUser.uid} schoolId=${schoolId}`);

  console.log("Seeding teacher accounts...");
  const sarahId = await upsertAccount({
    email: "sarah.mensah.demo@school-project-demo.test",
    username: "sarah.mensah",
    name: "Sarah Mensah",
    role: "TEACHER",
    schoolId,
    phone: "0244111222",
  });
  const kwameId = await upsertAccount({
    email: "kwame.boateng.demo@school-project-demo.test",
    username: "kwame.boateng",
    name: "Kwame Boateng",
    role: "TEACHER",
    schoolId,
    phone: "0244333444",
  });

  console.log("Seeding parent accounts...");
  const maryId = await upsertAccount({
    email: "mary.owusu.demo@school-project-demo.test",
    username: null,
    name: "Mary Owusu",
    role: "PARENT",
    schoolId,
    phone: "0244555666",
  });
  const johnId = await upsertAccount({
    email: "john.addo.demo@school-project-demo.test",
    username: null,
    name: "John Addo",
    role: "PARENT",
    schoolId,
    phone: "0244777888",
  });
  const graceId = await upsertAccount({
    email: "grace.amponsah.demo@school-project-demo.test",
    username: null,
    name: "Grace Amponsah",
    role: "PARENT",
    schoolId,
    phone: "0244999000",
  });

  console.log("Seeding classes...");
  const nurseryId = await ensure("classes", "name", "Nursery A", {
    name: "Nursery A",
    level: "NURSERY",
    homeroomTeacherId: sarahId,
    studentCount: null,
    subjectsOffered: null,
    createdAt: new Date().toISOString(),
    schoolId,
  });
  const primary1Id = await ensure("classes", "name", "Primary 1", {
    name: "Primary 1",
    level: "PRIMARY",
    homeroomTeacherId: kwameId,
    studentCount: null,
    subjectsOffered: null,
    createdAt: new Date().toISOString(),
    schoolId,
  });
  const primary4Id = await ensure("classes", "name", "Primary 4", {
    name: "Primary 4",
    level: "PRIMARY",
    homeroomTeacherId: sarahId,
    studentCount: null,
    subjectsOffered: null,
    createdAt: new Date().toISOString(),
    schoolId,
  });
  const jhs1Id = await ensure("classes", "name", "JHS 1", {
    name: "JHS 1",
    level: "JUNIOR",
    homeroomTeacherId: kwameId,
    studentCount: null,
    subjectsOffered: null,
    createdAt: new Date().toISOString(),
    schoolId,
  });
  console.log(`  Nursery A -> ${nurseryId}, Primary 1 -> ${primary1Id}, Primary 4 -> ${primary4Id}, JHS 1 -> ${jhs1Id}`);

  console.log("Seeding subjects...");
  const subjectNames = ["Numeracy", "Literacy", "Creative Arts", "Science", "Social Studies", "French"];
  const subjectIdByName = new Map<string, string>();
  for (const name of subjectNames) {
    const existing = await db
      .collection("subjects")
      .where("name", "==", name)
      .where("schoolId", "==", schoolId)
      .limit(1)
      .get();
    const id = existing.empty ? newId() : existing.docs[0]!.id;
    if (existing.empty) {
      await db.collection("subjects").doc(id).set({ name, code: null, isActivity: false, schoolId });
    }
    subjectIdByName.set(name, id);
  }
  const subjectIds = [...subjectIdByName.values()];
  console.log(`  ${subjectNames.length} subjects`);

  console.log("Seeding timetable...");
  const days = ["MON", "TUE", "WED", "THU", "FRI"];
  const periodTimes = [
    { period: 1, startTime: "08:00", endTime: "08:45" },
    { period: 2, startTime: "08:45", endTime: "09:30" },
    { period: 3, startTime: "09:45", endTime: "10:30" },
  ];
  const classSubjectRotation: Record<string, string[]> = {
    [nurseryId]: ["Numeracy", "Literacy", "Creative Arts"],
    [primary1Id]: ["Literacy", "Numeracy", "Science"],
    [primary4Id]: ["Science", "Social Studies", "Numeracy"],
    [jhs1Id]: ["French", "Social Studies", "Literacy"],
  };
  const classTeacher: Record<string, string> = {
    [nurseryId]: sarahId,
    [primary1Id]: kwameId,
    [primary4Id]: sarahId,
    [jhs1Id]: kwameId,
  };
  for (const [classId, subjects] of Object.entries(classSubjectRotation)) {
    for (const day of days) {
      for (let i = 0; i < periodTimes.length; i++) {
        const pt = periodTimes[i]!;
        const subjectId = subjectIdByName.get(subjects[i % subjects.length]!)!;
        const existing = await db
          .collection("timetableSlots")
          .where("classId", "==", classId)
          .where("day", "==", day)
          .where("startTime", "==", pt.startTime)
          .limit(1)
          .get();
        if (existing.empty) {
          await db.collection("timetableSlots").doc(newId()).set({
            classId,
            subjectId,
            teacherId: classTeacher[classId] ?? null,
            day,
            period: pt.period,
            startTime: pt.startTime,
            endTime: pt.endTime,
          });
        }
      }
      // Lunch, common to every class
      const lunchExisting = await db
        .collection("timetableSlots")
        .where("classId", "==", classId)
        .where("day", "==", day)
        .where("startTime", "==", "12:00")
        .limit(1)
        .get();
      if (lunchExisting.empty) {
        await db.collection("timetableSlots").doc(newId()).set({
          classId,
          subjectId: "lunch",
          teacherId: null,
          day,
          period: null,
          startTime: "12:00",
          endTime: "12:30",
        });
      }
    }
  }
  console.log("  Timetable slots seeded for all 4 classes x 5 days");

  console.log("Seeding students...");
  const studentSeeds: {
    admissionNo: string;
    firstName: string;
    lastName: string;
    dob: Date;
    classId: string;
    guardianName: string;
    guardianPhone: string;
    address: string;
    parentUserId?: string;
  }[] = [
    { admissionNo: "ADM-2026-0001", firstName: "Ama", lastName: "Owusu", dob: new Date(2021, 3, 12), classId: nurseryId, guardianName: "Mary Owusu", guardianPhone: "0244555666", address: "12 Palm Avenue, East Legon", parentUserId: maryId },
    { admissionNo: "ADM-2026-0002", firstName: "Kofi", lastName: "Owusu", dob: new Date(2021, 7, 3), classId: nurseryId, guardianName: "Mary Owusu", guardianPhone: "0244555666", address: "12 Palm Avenue, East Legon", parentUserId: maryId },
    { admissionNo: "ADM-2026-0003", firstName: "Kwabena", lastName: "Addo", dob: new Date(2019, 1, 20), classId: primary1Id, guardianName: "John Addo", guardianPhone: "0244777888", address: "5 Ring Road, Osu", parentUserId: johnId },
    { admissionNo: "ADM-2026-0004", firstName: "Abena", lastName: "Addo", dob: new Date(2019, 9, 9), classId: primary1Id, guardianName: "John Addo", guardianPhone: "0244777888", address: "5 Ring Road, Osu", parentUserId: johnId },
    { admissionNo: "ADM-2026-0005", firstName: "Yaw", lastName: "Amponsah", dob: new Date(2016, 5, 18), classId: primary4Id, guardianName: "Grace Amponsah", guardianPhone: "0244999000", address: "22 Spintex Road", parentUserId: graceId },
    { admissionNo: "ADM-2026-0006", firstName: "Esi", lastName: "Amponsah", dob: new Date(2016, 11, 2), classId: primary4Id, guardianName: "Grace Amponsah", guardianPhone: "0244999000", address: "22 Spintex Road", parentUserId: graceId },
    { admissionNo: "ADM-2026-0007", firstName: "Nana", lastName: "Yeboah", dob: new Date(2013, 2, 14), classId: jhs1Id, guardianName: "Comfort Yeboah", guardianPhone: "0244123456", address: "8 Labone Crescent" },
    { admissionNo: "ADM-2026-0008", firstName: "Akosua", lastName: "Darko", dob: new Date(2013, 8, 25), classId: jhs1Id, guardianName: "Ernest Darko", guardianPhone: "0244654321", address: "17 Achimota Ridge" },
    { admissionNo: "ADM-2026-0009", firstName: "Kojo", lastName: "Mensah", dob: new Date(2020, 4, 6), classId: primary1Id, guardianName: "Efua Mensah", guardianPhone: "0244246810", address: "3 Cantonments Road" },
    { admissionNo: "ADM-2026-0010", firstName: "Adjoa", lastName: "Sarpong", dob: new Date(2021, 0, 30), classId: nurseryId, guardianName: "Kwesi Sarpong", guardianPhone: "0244135790", address: "9 Airport Residential" },
  ];

  const studentIds: string[] = [];
  for (const s of studentSeeds) {
    const id = await ensure("students", "admissionNo", s.admissionNo, {
      admissionNo: s.admissionNo,
      firstName: s.firstName,
      lastName: s.lastName,
      dob: s.dob.toISOString(),
      photoUrl: null,
      isFirstTime: false,
      classId: s.classId,
      guardianName: s.guardianName,
      guardianPhone: s.guardianPhone,
      secondaryGuardianName: null,
      secondaryGuardianPhone: null,
      address: s.address,
      createdAt: new Date().toISOString(),
      schoolId,
    });
    studentIds.push(id);
    if (s.parentUserId) {
      const link = await db
        .collection("guardianships")
        .where("parentUserId", "==", s.parentUserId)
        .where("studentId", "==", id)
        .limit(1)
        .get();
      if (link.empty) {
        await db.collection("guardianships").doc(newId()).set({
          parentUserId: s.parentUserId,
          studentId: id,
          relation: "Parent",
        });
      }
    }
    console.log(`  ${s.firstName} ${s.lastName} -> ${id}`);
  }

  console.log("Seeding attendance for the last 10 days...");
  for (let dayOffset = 0; dayOffset < 10; dayOffset++) {
    const date = dateOnlyDaysAgo(dayOffset);
    for (let i = 0; i < studentIds.length; i++) {
      const studentId = studentIds[i]!;
      // Deterministic-ish variety: mostly present, a few absent/late.
      const roll = (i + dayOffset) % 7;
      const status = roll === 0 ? "ABSENT" : roll === 1 ? "LATE" : "PRESENT";
      const markedById = i % 2 === 0 ? sarahId : kwameId;
      const docId = `${studentId}_${date}`;
      const existing = await db.collection("attendance").doc(docId).get();
      if (!existing.exists) {
        await db.collection("attendance").doc(docId).set({
          studentId,
          date,
          status,
          markedById,
          createdAt: isoDaysAgo(dayOffset),
        });
      }
    }
  }
  console.log("  Attendance seeded (10 days x 10 students)");

  console.log("Seeding absence alerts...");
  // Pull yesterday's ABSENT records and raise an alert for a couple of them.
  const yesterday = dateOnlyDaysAgo(1);
  const absentYesterday = await db
    .collection("attendance")
    .where("date", "==", yesterday)
    .where("status", "==", "ABSENT")
    .get();
  let alertCount = 0;
  for (const doc of absentYesterday.docs) {
    if (!studentIds.includes((doc.data() as { studentId: string }).studentId)) continue;
    if (alertCount >= 3) break;
    const existing = await db.collection("absenceAlerts").where("attendanceId", "==", doc.id).limit(1).get();
    if (existing.empty) {
      await db.collection("absenceAlerts").doc(newId()).set({
        attendanceId: doc.id,
        message: "Your child was marked absent. Please let us know why.",
        parentReason: alertCount === 0 ? "Down with a cold, back tomorrow." : null,
        status: alertCount === 0 ? "RESPONDED" : "PENDING",
        respondedAt: alertCount === 0 ? isoDaysAgo(1) : null,
        createdAt: isoDaysAgo(1),
      });
    }
    alertCount++;
  }
  console.log(`  ${alertCount} absence alerts`);

  console.log("Seeding photos, progress updates, term reports + marks...");
  const hues = [200, 20, 320, 140, 60];
  for (let i = 0; i < 4; i++) {
    const studentId = studentIds[i]!;
    const teacherId = i % 2 === 0 ? sarahId : kwameId;
    const mediaExists = await db.collection("media").where("studentId", "==", studentId).limit(1).get();
    if (mediaExists.empty) {
      await db.collection("media").doc(newId()).set({
        studentId,
        teacherId,
        fileUrl: photo(`${studentSeeds[i]!.firstName}'s class`, hues[i % hues.length]!),
        caption: `${studentSeeds[i]!.firstName} having a great time in class!`,
        createdAt: isoDaysAgo(i + 1),
      });
    }
  }

  for (let i = 0; i < 6; i++) {
    const studentId = studentIds[i]!;
    const teacherId = i % 2 === 0 ? sarahId : kwameId;
    const progressExists = await db.collection("progress").where("studentId", "==", studentId).limit(1).get();
    if (progressExists.empty) {
      await db.collection("progress").doc(newId()).set({
        studentId,
        teacherId,
        term: "First Term",
        strengths: "Settled in well and enjoys group activities.",
        talents: "Shows real curiosity and enjoys hands-on tasks.",
        needs: "Could use more practice with focus during quiet work.",
        howParentsCanHelp: "Read together for 15 minutes each evening.",
        createdAt: isoDaysAgo(i + 2),
      });
    }
  }

  const scorePool = [92, 88, 76, 65, 81, 95, 70, 84];
  for (let i = 0; i < studentIds.length; i++) {
    const studentId = studentIds[i]!;
    const student = studentSeeds[i]!;
    const reportExists = await db.collection("termReports").where("studentId", "==", studentId).limit(1).get();
    if (reportExists.empty) {
      const reportId = newId();
      await db.collection("termReports").doc(reportId).set({
        studentId,
        term: "First Term",
        year: 2026,
        fileUrl: null,
        classId: student.classId,
        promotedToClassId: null,
        reopenDate: null,
        promotionAppliedAt: null,
        positionInClass: `${(i % 5) + 1}th out of 10`,
        progress: "Making steady progress this term.",
        interest: "Shows strong interest in Creative Arts and group play.",
        strength: "Good attendance and a positive attitude.",
        howParentsCanHelp: "Encourage reading at home each evening.",
        createdAt: isoDaysAgo(3),
      });
      const pickedSubjects = subjectIds.slice(0, 4);
      for (let s = 0; s < pickedSubjects.length; s++) {
        const score = scorePool[(i + s) % scorePool.length]!;
        await db.collection("marks").doc(newId()).set({
          termReportId: reportId,
          subjectId: pickedSubjects[s],
          score,
          grade: score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : "D",
          comment: score >= 80 ? "Excellent" : score >= 70 ? "Good progress" : "Needs more practice",
        });
      }
    }
  }
  console.log("  Photos, progress updates, term reports + marks seeded");

  console.log("Seeding invoices + payments (fees)...");
  const invoiceStatuses: ("PAID" | "PARTIAL" | "UNPAID")[] = ["PAID", "PARTIAL", "UNPAID"];
  for (let i = 0; i < studentIds.length; i++) {
    const studentId = studentIds[i]!;
    const invoiceExists = await db.collection("invoices").where("studentId", "==", studentId).limit(1).get();
    if (invoiceExists.empty) {
      const status = invoiceStatuses[i % invoiceStatuses.length]!;
      const amount = 1500;
      const invoiceId = newId();
      await db.collection("invoices").doc(invoiceId).set({
        studentId,
        term: "First Term 2026",
        amount,
        dueDate: new Date(2026, 8, 30).toISOString(),
        status,
        createdAt: isoDaysAgo(20),
        schoolId,
      });
      if (status !== "UNPAID") {
        const paid = status === "PAID" ? amount : Math.round(amount * 0.5);
        await db.collection("payments").doc(newId()).set({
          invoiceId,
          amount: paid,
          method: i % 2 === 0 ? "momo" : "cash",
          createdAt: isoDaysAgo(10),
        });
      }
    }
  }
  console.log("  Invoices + payments seeded");

  console.log("Seeding messages...");
  const messageSeeds: { senderId: string; receiverId: string; body: string; daysAgo: number; read: boolean }[] = [
    { senderId: maryId, receiverId: adminAuthUser.uid, body: "Good morning! Just checking Ama settled in okay today.", daysAgo: 2, read: true },
    { senderId: adminAuthUser.uid, receiverId: maryId, body: "Good morning Mary — yes, she had a lovely first morning!", daysAgo: 2, read: true },
    { senderId: sarahId, receiverId: adminAuthUser.uid, body: "Nursery A's art supplies are running low, could we reorder?", daysAgo: 1, read: false },
    { senderId: johnId, receiverId: kwameId, body: "Will Kwabena need anything extra for the Primary 1 trip?", daysAgo: 1, read: false },
    { senderId: kwameId, receiverId: johnId, body: "Just a water bottle and closed shoes — thanks for asking!", daysAgo: 1, read: true },
    { senderId: graceId, receiverId: adminAuthUser.uid, body: "Could I get a copy of Yaw's term report when it's ready?", daysAgo: 0, read: false },
  ];
  for (const m of messageSeeds) {
    const existing = await db
      .collection("messages")
      .where("senderId", "==", m.senderId)
      .where("receiverId", "==", m.receiverId)
      .where("body", "==", m.body)
      .limit(1)
      .get();
    if (existing.empty) {
      await db.collection("messages").doc(newId()).set({
        senderId: m.senderId,
        receiverId: m.receiverId,
        body: m.body,
        createdAt: isoDaysAgo(m.daysAgo),
        readAt: m.read ? isoDaysAgo(Math.max(0, m.daysAgo - 0.01)) : null,
      });
    }
  }
  console.log(`  ${messageSeeds.length} messages`);

  console.log("Seeding notifications for the admin account...");
  const notificationSeeds = [
    { type: "absence_alert", title: "New absence alert", body: "A student was marked absent today.", daysAgo: 1, read: false },
    { type: "message", title: "New message from Grace Amponsah", body: "Could I get a copy of Yaw's term report when it's ready?", daysAgo: 0, read: false },
    { type: "invoice", title: "Payment received", body: "A partial payment was recorded on an invoice.", daysAgo: 3, read: true },
  ];
  for (const n of notificationSeeds) {
    const existing = await db
      .collection("notifications")
      .where("userId", "==", adminAuthUser.uid)
      .where("title", "==", n.title)
      .limit(1)
      .get();
    if (existing.empty) {
      await db.collection("notifications").doc(newId()).set({
        userId: adminAuthUser.uid,
        type: n.type,
        title: n.title,
        body: n.body,
        data: null,
        readAt: n.read ? isoDaysAgo(n.daysAgo) : null,
        createdAt: isoDaysAgo(n.daysAgo),
      });
    }
  }
  console.log(`  ${notificationSeeds.length} notifications`);

  console.log("\nDone. Sign in at your app's /login with:");
  console.log(`  ${TARGET_ADMIN_EMAIL} / (your existing password)   — admin, ${adminData.name}`);
  console.log("  sarah.mensah.demo@school-project-demo.test / password123   (teacher)");
  console.log("  kwame.boateng.demo@school-project-demo.test / password123  (teacher)");
  console.log("  mary.owusu.demo@school-project-demo.test / password123     (parent of Ama & Kofi Owusu)");
  console.log("  john.addo.demo@school-project-demo.test / password123      (parent of Kwabena & Abena Addo)");
  console.log("  grace.amponsah.demo@school-project-demo.test / password123 (parent of Yaw & Esi Amponsah)");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
