// Full-scale demo seed for a brand-new account (demo@test.com) on the real
// (production) Firebase project — every class from Nursery through JHS 3,
// >=30 students per class, a full subject list, and every downstream
// collection every page reads from. Connects directly via the checked-in
// service-account.json (see seed-account.ts for the same pattern against an
// existing account). Uses Firestore's bulkWriter for the several-thousand
// document writes this scale requires — plain sequential awaits would take
// far too long.
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

const ADMIN_EMAIL = "demo@test.com";
const PASSWORD = "password123";
const STUDENTS_PER_CLASS = 30;

// ---------- name pools (just for variety; admissionNo is the real unique key) ----------
const FIRST_NAMES = [
  "Kwame", "Kwabena", "Kwaku", "Yaw", "Kofi", "Kwadwo", "Kwasi", "Fiifi", "Kojo", "Kwabla",
  "Ama", "Abena", "Akua", "Yaa", "Afua", "Adjoa", "Akosua", "Esi", "Aba", "Adwoa",
  "Nana", "Kobby", "Kobina", "Ekow", "Nii", "Naa", "Mansa", "Efua", "Araba", "Kwamena",
  "Selorm", "Elikem", "Mawuli", "Delali", "Sena", "Edem", "Enyonam", "Worlanyo", "Mawusi",
  "Abdul", "Fatima", "Mohammed", "Aisha", "Ibrahim", "Hafsat", "Yussif", "Zainab", "Rashid", "Amina",
];
const LAST_NAMES = [
  "Owusu", "Mensah", "Boateng", "Addo", "Amponsah", "Yeboah", "Darko", "Asante", "Agyeman", "Ansah",
  "Appiah", "Sarpong", "Osei", "Frimpong", "Baffour", "Nkrumah", "Danso", "Antwi", "Adjei", "Kufuor",
  "Gyasi", "Opoku", "Acheampong", "Bediako", "Twum", "Adu", "Sekyere", "Bonsu", "Kwarteng", "Amoako",
  "Tetteh", "Lartey", "Ashong", "Odoi", "Quaye", "Nartey", "Aryee", "Adjetey", "Laryea",
  "Mahama", "Iddrisu", "Alhassan", "Sulemana", "Fuseini", "Abdulai", "Yakubu",
];
let rngState = 42; // small deterministic PRNG so re-reading the output is reproducible
function rand(): number {
  rngState = (rngState * 1103515245 + 12345) & 0x7fffffff;
  return rngState / 0x7fffffff;
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rand() * arr.length)]!;
}
function pad(n: number, width: number): string {
  return String(n).padStart(width, "0");
}
function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString();
}
function dateOnlyDaysAgo(n: number): string {
  return isoDaysAgo(n).slice(0, 10);
}
function photo(label: string, hue: number): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'>` +
    `<rect width='400' height='300' fill='hsl(${hue},70%,55%)'/>` +
    `<text x='50%' y='50%' fill='#fff' font-family='sans-serif' font-size='24' font-weight='bold' text-anchor='middle' dominant-baseline='middle'>${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// ---------- class list: Nursery -> Kindergarten 1/2 -> Primary 1-6 -> JHS 1-3 ----------
const CLASS_DEFS: { name: string; level: "NURSERY" | "PRIMARY" | "JUNIOR"; age: number }[] = [
  { name: "Nursery", level: "NURSERY", age: 3 },
  { name: "Kindergarten 1", level: "NURSERY", age: 4 },
  { name: "Kindergarten 2", level: "NURSERY", age: 5 },
  { name: "Primary 1", level: "PRIMARY", age: 6 },
  { name: "Primary 2", level: "PRIMARY", age: 7 },
  { name: "Primary 3", level: "PRIMARY", age: 8 },
  { name: "Primary 4", level: "PRIMARY", age: 9 },
  { name: "Primary 5", level: "PRIMARY", age: 10 },
  { name: "Primary 6", level: "PRIMARY", age: 11 },
  { name: "JHS 1", level: "JUNIOR", age: 12 },
  { name: "JHS 2", level: "JUNIOR", age: 13 },
  { name: "JHS 3", level: "JUNIOR", age: 14 },
];

const SUBJECT_DEFS: { name: string; isActivity: boolean }[] = [
  { name: "Mathematics", isActivity: false },
  { name: "English Language", isActivity: false },
  { name: "Integrated Science", isActivity: false },
  { name: "Social Studies", isActivity: false },
  { name: "Religious and Moral Education", isActivity: false },
  { name: "Creative Arts", isActivity: false },
  { name: "French", isActivity: false },
  { name: "Computing (ICT)", isActivity: false },
  { name: "Ghanaian Language", isActivity: false },
  { name: "Home Economics", isActivity: false },
  { name: "Physical Education", isActivity: true },
  { name: "Music", isActivity: true },
];

async function main() {
  console.log(`Creating admin account ${ADMIN_EMAIL}...`);
  let adminUid: string;
  try {
    const existing = await auth.getUserByEmail(ADMIN_EMAIL);
    adminUid = existing.uid;
    console.log(`  already exists -> ${adminUid}`);
  } catch {
    const created = await auth.createUser({
      email: ADMIN_EMAIL,
      password: PASSWORD,
      displayName: "Demo Admin",
      emailVerified: true,
    });
    adminUid = created.uid;
    console.log(`  created -> ${adminUid}`);
  }

  const existingUserDoc = await db.collection("users").doc(adminUid).get();
  let schoolId: string;
  if (existingUserDoc.exists) {
    schoolId = (existingUserDoc.data() as { schoolId: string }).schoolId;
    console.log(`  reusing existing school -> ${schoolId}`);
  } else {
    schoolId = newId();
    await db.collection("schools").doc(schoolId).set({
      name: "Demo Academy",
      email: ADMIN_EMAIL,
      phone: null,
      address: null,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
    });
    await db.collection("users").doc(adminUid).set({
      email: ADMIN_EMAIL,
      username: "demo.admin",
      name: "Demo Admin",
      role: "ADMIN",
      phone: null,
      avatarUrl: null,
      createdAt: new Date().toISOString(),
      schoolId,
    });
    console.log(`  created school -> ${schoolId}`);
  }

  console.log(`Creating ${CLASS_DEFS.length} teacher accounts (one homeroom per class)...`);
  const teacherIds: string[] = [];
  for (let i = 0; i < CLASS_DEFS.length; i++) {
    const email = `teacher${pad(i + 1, 2)}.demo@school-project-demo.test`;
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    let uid: string;
    try {
      const existing = await auth.getUserByEmail(email);
      uid = existing.uid;
    } catch {
      const created = await auth.createUser({ email, password: PASSWORD, displayName: name, emailVerified: true });
      uid = created.uid;
    }
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) {
      await db.collection("users").doc(uid).set({
        email,
        username: `teacher${pad(i + 1, 2)}`,
        name,
        role: "TEACHER",
        phone: `024${pad(1000000 + i, 7)}`,
        avatarUrl: null,
        createdAt: new Date().toISOString(),
        schoolId,
      });
    }
    teacherIds.push(uid);
  }
  console.log(`  ${teacherIds.length} teachers ready`);

  console.log(`Creating ${CLASS_DEFS.length} parent accounts (one per class, linked to that class's first student)...`);
  const parentIds: string[] = [];
  const parentNames: string[] = [];
  const parentPhones: string[] = [];
  for (let i = 0; i < CLASS_DEFS.length; i++) {
    const email = `parent${pad(i + 1, 2)}.demo@school-project-demo.test`;
    const name = `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
    const phone = `025${pad(2000000 + i, 7)}`;
    let uid: string;
    try {
      const existing = await auth.getUserByEmail(email);
      uid = existing.uid;
    } catch {
      const created = await auth.createUser({ email, password: PASSWORD, displayName: name, emailVerified: true });
      uid = created.uid;
    }
    const snap = await db.collection("users").doc(uid).get();
    if (!snap.exists) {
      await db.collection("users").doc(uid).set({
        email,
        username: null,
        name,
        role: "PARENT",
        phone,
        avatarUrl: null,
        createdAt: new Date().toISOString(),
        schoolId,
      });
    }
    parentIds.push(uid);
    parentNames.push((snap.exists ? (snap.data() as { name: string }).name : name));
    parentPhones.push((snap.exists ? (snap.data() as { phone: string | null }).phone : phone) ?? phone);
  }
  console.log(`  ${parentIds.length} parents ready`);

  // ---------- everything else goes through one bulkWriter ----------
  const bulk = db.bulkWriter();
  bulk.onWriteError((err) => {
    console.error("  write error:", err.message);
    return err.failedAttempts < 3;
  });

  console.log(`Queuing ${CLASS_DEFS.length} classes...`);
  const classIds: string[] = [];
  for (let i = 0; i < CLASS_DEFS.length; i++) {
    const def = CLASS_DEFS[i]!;
    const classId = newId();
    classIds.push(classId);
    bulk.set(db.collection("classes").doc(classId), {
      name: def.name,
      level: def.level,
      homeroomTeacherId: teacherIds[i]!,
      studentCount: null,
      subjectsOffered: null,
      createdAt: new Date().toISOString(),
      schoolId,
    });
  }

  console.log(`Queuing ${SUBJECT_DEFS.length} subjects...`);
  const subjectIds: string[] = [];
  for (const def of SUBJECT_DEFS) {
    const subjectId = newId();
    subjectIds.push(subjectId);
    bulk.set(db.collection("subjects").doc(subjectId), {
      name: def.name,
      code: null,
      isActivity: def.isActivity,
      schoolId,
    });
  }

  console.log("Queuing timetable (3 periods + lunch x 5 days x every class)...");
  const days = ["MON", "TUE", "WED", "THU", "FRI"];
  const periodTimes = [
    { period: 1, startTime: "08:00", endTime: "08:45" },
    { period: 2, startTime: "08:45", endTime: "09:30" },
    { period: 3, startTime: "09:45", endTime: "10:30" },
  ];
  for (let ci = 0; ci < classIds.length; ci++) {
    const classId = classIds[ci]!;
    const teacherId = teacherIds[ci]!;
    // Each class rotates through 3 non-activity subjects offset by class index.
    const nonActivitySubjectIdx = SUBJECT_DEFS.map((d, idx) => (d.isActivity ? -1 : idx)).filter((x) => x >= 0);
    const rotation = [0, 1, 2].map((k) => subjectIds[nonActivitySubjectIdx[(ci + k) % nonActivitySubjectIdx.length]!]!);
    for (const day of days) {
      for (let p = 0; p < periodTimes.length; p++) {
        const pt = periodTimes[p]!;
        bulk.set(db.collection("timetableSlots").doc(newId()), {
          classId,
          subjectId: rotation[p]!,
          teacherId,
          day,
          period: pt.period,
          startTime: pt.startTime,
          endTime: pt.endTime,
        });
      }
      bulk.set(db.collection("timetableSlots").doc(newId()), {
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

  console.log(`Queuing ${classIds.length * STUDENTS_PER_CLASS} students...`);
  const allStudentIds: string[] = [];
  const studentClassOf = new Map<string, string>();
  let admissionCounter = 1;
  for (let ci = 0; ci < classIds.length; ci++) {
    const classId = classIds[ci]!;
    const def = CLASS_DEFS[ci]!;
    for (let s = 0; s < STUDENTS_PER_CLASS; s++) {
      const studentId = newId();
      allStudentIds.push(studentId);
      studentClassOf.set(studentId, classId);
      const admissionNo = `ADM-2026-${pad(admissionCounter++, 4)}`;
      const firstName = pick(FIRST_NAMES);
      const lastName = pick(LAST_NAMES);
      const dob = new Date(2026 - def.age, Math.floor(rand() * 12), 1 + Math.floor(rand() * 28));
      const isFlagship = s === 0; // first student of each class gets a real linked parent account
      const guardianName = isFlagship ? parentNames[ci]! : `${pick(FIRST_NAMES)} ${lastName}`;
      const guardianPhone = isFlagship ? parentPhones[ci]! : `024${pad(3000000 + admissionCounter, 7)}`;
      bulk.set(db.collection("students").doc(studentId), {
        admissionNo,
        firstName,
        lastName,
        dob: dob.toISOString(),
        photoUrl: null,
        isFirstTime: rand() < 0.15,
        classId,
        guardianName,
        guardianPhone,
        secondaryGuardianName: null,
        secondaryGuardianPhone: null,
        address: `${1 + Math.floor(rand() * 30)} ${pick(["Ring Road", "Spintex Road", "Palm Avenue", "Cantonments Road", "Achimota Ridge", "Labone Crescent", "Airport Residential", "Osu Oxford Street"])}`,
        createdAt: new Date().toISOString(),
        schoolId,
      });
      if (isFlagship) {
        const parentId = parentIds[ci]!;
        bulk.set(db.collection("guardianships").doc(newId()), {
          parentUserId: parentId,
          studentId,
          relation: "Parent",
        });
      }
    }
  }

  console.log("Queuing 10 days of attendance for every student...");
  for (let dayOffset = 0; dayOffset < 10; dayOffset++) {
    const date = dateOnlyDaysAgo(dayOffset);
    for (let i = 0; i < allStudentIds.length; i++) {
      const studentId = allStudentIds[i]!;
      const roll = (i + dayOffset) % 7;
      const status = roll === 0 ? "ABSENT" : roll === 1 ? "LATE" : "PRESENT";
      const classId = studentClassOf.get(studentId)!;
      const ci = classIds.indexOf(classId);
      const markedById = teacherIds[ci] ?? teacherIds[0]!;
      bulk.set(db.collection("attendance").doc(`${studentId}_${date}`), {
        studentId,
        date,
        status,
        markedById,
        createdAt: isoDaysAgo(dayOffset),
      });
    }
  }

  console.log("Queuing photos + progress updates (a few per class)...");
  const hues = [200, 20, 320, 140, 60, 280, 10, 170];
  for (let ci = 0; ci < classIds.length; ci++) {
    const teacherId = teacherIds[ci]!;
    const classStudents = allStudentIds.filter((id) => studentClassOf.get(id) === classIds[ci]);
    for (let k = 0; k < 2; k++) {
      const studentId = classStudents[k]!;
      bulk.set(db.collection("media").doc(newId()), {
        studentId,
        teacherId,
        fileUrl: photo(`${CLASS_DEFS[ci]!.name}`, hues[(ci + k) % hues.length]!),
        caption: `A snapshot from ${CLASS_DEFS[ci]!.name}'s activities this term.`,
        createdAt: isoDaysAgo(k + 1),
      });
      bulk.set(db.collection("progress").doc(newId()), {
        studentId,
        teacherId,
        term: "First Term",
        strengths: "Settled in well and participates actively in class.",
        talents: "Shows real enthusiasm for hands-on and creative tasks.",
        needs: "Could benefit from more focused practice time.",
        howParentsCanHelp: "Review the day's lesson together each evening.",
        createdAt: isoDaysAgo(k + 2),
      });
    }
  }

  console.log("Queuing term reports + marks for every student...");
  const scorePool = [92, 88, 76, 65, 81, 95, 70, 84, 58, 90, 73, 99];
  for (let i = 0; i < allStudentIds.length; i++) {
    const studentId = allStudentIds[i]!;
    const classId = studentClassOf.get(studentId)!;
    const reportId = newId();
    bulk.set(db.collection("termReports").doc(reportId), {
      studentId,
      term: "First Term",
      year: 2026,
      fileUrl: null,
      classId,
      promotedToClassId: null,
      reopenDate: null,
      promotionAppliedAt: null,
      positionInClass: `${(i % STUDENTS_PER_CLASS) + 1}th out of ${STUDENTS_PER_CLASS}`,
      progress: "Making steady progress this term.",
      interest: "Shows strong interest in group work and creative activities.",
      strength: "Good attendance and a positive attitude.",
      howParentsCanHelp: "Encourage reading and revision at home each evening.",
      createdAt: isoDaysAgo(3),
    });
    for (let s = 0; s < 4; s++) {
      const subjectId = subjectIds[(i + s) % subjectIds.length]!;
      const score = scorePool[(i + s) % scorePool.length]!;
      bulk.set(db.collection("marks").doc(newId()), {
        termReportId: reportId,
        subjectId,
        score,
        grade: score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : "D",
        comment: score >= 80 ? "Excellent" : score >= 70 ? "Good progress" : "Needs more practice",
      });
    }
  }

  console.log("Queuing invoices + payments (fees) for every student...");
  const invoiceStatuses: ("PAID" | "PARTIAL" | "UNPAID")[] = ["PAID", "PARTIAL", "UNPAID"];
  for (let i = 0; i < allStudentIds.length; i++) {
    const studentId = allStudentIds[i]!;
    const status = invoiceStatuses[i % invoiceStatuses.length]!;
    const amount = 1500;
    const invoiceId = newId();
    bulk.set(db.collection("invoices").doc(invoiceId), {
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
      bulk.set(db.collection("payments").doc(newId()), {
        invoiceId,
        amount: paid,
        method: i % 2 === 0 ? "momo" : "cash",
        createdAt: isoDaysAgo(10),
      });
    }
  }

  console.log("Queuing absence alerts...");
  await bulk.flush(); // make sure attendance is committed before we query yesterday's absences
  const yesterday = dateOnlyDaysAgo(1);
  const absentYesterday = await db
    .collection("attendance")
    .where("date", "==", yesterday)
    .where("status", "==", "ABSENT")
    .limit(12)
    .get();
  let alertCount = 0;
  for (const doc of absentYesterday.docs) {
    bulk.set(db.collection("absenceAlerts").doc(newId()), {
      attendanceId: doc.id,
      message: "Your child was marked absent. Please let us know why.",
      parentReason: alertCount % 3 === 0 ? "Down with a cold, back tomorrow." : null,
      status: alertCount % 3 === 0 ? "RESPONDED" : "PENDING",
      respondedAt: alertCount % 3 === 0 ? isoDaysAgo(1) : null,
      createdAt: isoDaysAgo(1),
    });
    alertCount++;
  }

  console.log("Queuing messages + notifications...");
  const flagshipParent = parentIds[0]!;
  const homeroomOfFirstClass = teacherIds[0]!;
  const messageSeeds: { senderId: string; receiverId: string; body: string; daysAgo: number; read: boolean }[] = [
    { senderId: flagshipParent, receiverId: adminUid, body: "Good morning! Just checking my child settled in okay today.", daysAgo: 2, read: true },
    { senderId: adminUid, receiverId: flagshipParent, body: "Good morning — yes, a lovely first morning!", daysAgo: 2, read: true },
    { senderId: homeroomOfFirstClass, receiverId: adminUid, body: "We're running low on classroom supplies, could we reorder?", daysAgo: 1, read: false },
    { senderId: parentIds[1]!, receiverId: teacherIds[1]!, body: "Will my child need anything extra for the upcoming trip?", daysAgo: 1, read: false },
    { senderId: teacherIds[1]!, receiverId: parentIds[1]!, body: "Just a water bottle and closed shoes — thanks for asking!", daysAgo: 1, read: true },
    { senderId: parentIds[2]!, receiverId: adminUid, body: "Could I get a copy of the term report when it's ready?", daysAgo: 0, read: false },
  ];
  for (const m of messageSeeds) {
    bulk.set(db.collection("messages").doc(newId()), {
      senderId: m.senderId,
      receiverId: m.receiverId,
      body: m.body,
      createdAt: isoDaysAgo(m.daysAgo),
      readAt: m.read ? isoDaysAgo(m.daysAgo) : null,
    });
  }

  const notificationSeeds = [
    { type: "absence_alert", title: "New absence alert", body: "A student was marked absent today.", daysAgo: 1, read: false },
    { type: "message", title: "New message received", body: "You have a new message about a term report.", daysAgo: 0, read: false },
    { type: "invoice", title: "Payment received", body: "A partial payment was recorded on an invoice.", daysAgo: 3, read: true },
    { type: "student", title: "New students enrolled", body: `${allStudentIds.length} students are now enrolled across ${classIds.length} classes.`, daysAgo: 5, read: true },
  ];
  for (const n of notificationSeeds) {
    bulk.set(db.collection("notifications").doc(newId()), {
      userId: adminUid,
      type: n.type,
      title: n.title,
      body: n.body,
      data: null,
      readAt: n.read ? isoDaysAgo(n.daysAgo) : null,
      createdAt: isoDaysAgo(n.daysAgo),
    });
  }

  console.log("Flushing remaining writes...");
  await bulk.close();

  console.log("\nDone. Summary:");
  console.log(`  School: Demo Academy (${schoolId})`);
  console.log(`  Classes: ${classIds.length} (Nursery -> Kindergarten 1/2 -> Primary 1-6 -> JHS 1-3)`);
  console.log(`  Subjects: ${subjectIds.length}`);
  console.log(`  Students: ${allStudentIds.length} (${STUDENTS_PER_CLASS}/class)`);
  console.log(`  Teachers: ${teacherIds.length}, Parents: ${parentIds.length}`);
  console.log(`  Absence alerts: ${alertCount}`);
  console.log("\nSign in at your app's /login with:");
  console.log(`  ${ADMIN_EMAIL} / ${PASSWORD}   (admin, Demo Admin)`);
  console.log(`  teacher01.demo@school-project-demo.test / ${PASSWORD}   (homeroom of ${CLASS_DEFS[0]!.name})`);
  console.log(`  parent01.demo@school-project-demo.test / ${PASSWORD}    (parent, linked to a ${CLASS_DEFS[0]!.name} student)`);
  console.log("  ...(teacher02-12 / parent02-12 follow the same pattern, one per class)");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
