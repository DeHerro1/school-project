// -----------------------------------------------------------------------------
// Front-end-only mock backend.
//
// Builds a deterministic in-memory dataset (mirroring prisma/seed.ts) and answers
// the same REST calls the real API does — no network, no database. Both the
// school and parent portals route `useApi()` through `handleMockRequest()` so the
// whole app runs standalone. Data is scoped by the current user, exactly like the
// server scopes by `req.user`.
//
// Password for every seeded account is "password123".
// -----------------------------------------------------------------------------

import { Role } from "./enums";

export const MOCK_PASSWORD = "password123";

// ---------------------------------------------------------------- types ------
export interface MockUser {
  id: string;
  email: string;
  username: string | null;
  name: string;
  role: Role;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
}
interface MockClass {
  id: string;
  name: string;
  level: string;
  homeroomTeacherId: string | null;
  studentCount: number | null;
  subjectsOffered: string | null;
}
interface MockSubject { id: string; name: string; code: string | null; isActivity: boolean }
interface MockStudent {
  id: string; admissionNo: string; firstName: string; lastName: string; dob: string;
  isFirstTime: boolean; classId: string | null; guardianName: string | null;
  guardianPhone: string | null; secondaryGuardianName: string | null;
  secondaryGuardianPhone: string | null; address: string | null; photoUrl: string | null;
}
interface MockGuardianship { id: string; parentUserId: string; studentId: string; relation: string }
interface MockSlot {
  id: string; classId: string; subjectId: string; teacherId: string | null;
  day: string; period: number; startTime: string; endTime: string;
}
interface MockAttendance { id: string; studentId: string; date: string; status: string; markedById: string }
interface MockAlert {
  id: string; attendanceId: string; message: string; status: string;
  parentReason: string | null; respondedAt: string | null; createdAt: string;
}
interface MockMedia { id: string; studentId: string; teacherId: string; fileUrl: string; caption: string | null; createdAt: string }
interface MockMark { id: string; termReportId: string; subjectId: string; score: number; grade: string | null; comment: string | null }
interface MockTermReport {
  id: string; studentId: string; term: string; year: number; fileUrl: string | null;
  classId: string | null;
  promotedToClassId: string | null;
  reopenDate: string | null; promotionAppliedAt: string | null;
  positionInClass: string | null; progress: string | null; interest: string | null;
  strength: string | null; howParentsCanHelp: string | null;
  createdAt: string;
}
interface MockProgress {
  id: string; studentId: string; teacherId: string; term: string;
  strengths: string; talents: string; needs: string; howParentsCanHelp: string; createdAt: string;
}
interface MockPayment { id: string; invoiceId: string; amount: number; method: string | null; createdAt: string }
interface MockInvoice { id: string; studentId: string; term: string; amount: number; dueDate: string; status: string; createdAt: string }
interface MockMessage { id: string; senderId: string; receiverId: string; body: string; createdAt: string; readAt: string | null }
interface MockNotification {
  id: string; userId: string; type: string; title: string; body: string | null;
  data: Record<string, unknown> | null; readAt: string | null; createdAt: string;
}

interface MockDb {
  users: MockUser[];
  passwords: Record<string, string>;
  classes: MockClass[];
  subjects: MockSubject[];
  students: MockStudent[];
  guardianships: MockGuardianship[];
  slots: MockSlot[];
  attendance: MockAttendance[];
  alerts: MockAlert[];
  media: MockMedia[];
  termReports: MockTermReport[];
  marks: MockMark[];
  progress: MockProgress[];
  invoices: MockInvoice[];
  payments: MockPayment[];
  messages: MockMessage[];
  notifications: MockNotification[];
}

// ---------------------------------------------------------------- helpers ----
let counter = 0;
const nextId = (p: string) => `${p}-${++counter}`;

function dateOnly(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function daysAgo(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return dateOnly(d);
}
function recentWeekdays(count: number): Date[] {
  const out: Date[] = [];
  let n = 0;
  while (out.length < count) {
    const d = daysAgo(n);
    const dow = d.getUTCDay();
    if (dow >= 1 && dow <= 5) out.push(d);
    n++;
  }
  return out;
}
/** A small inline SVG "photo" so galleries have something to show, no network. */
function photo(label: string, hue: number): string {
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300'>` +
    `<rect width='400' height='300' fill='hsl(${hue},70%,55%)'/>` +
    `<rect width='400' height='300' fill='url(#g)' opacity='.35'/>` +
    `<defs><radialGradient id='g'><stop offset='0' stop-color='#fff'/><stop offset='1' stop-color='#000'/></radialGradient></defs>` +
    `<text x='50%' y='50%' fill='#fff' font-family='sans-serif' font-size='26' font-weight='bold' text-anchor='middle' dominant-baseline='middle'>${label}</text>` +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

// ---------------------------------------------------------------- builder ----
function buildDb(): MockDb {
  counter = 0;
  const users: MockUser[] = [];
  const passwords: Record<string, string> = {};
  const now = new Date();
  const iso = (d: Date) => d.toISOString();

  const mkUser = (
    id: string, email: string, username: string | null, name: string, role: Role, phone: string,
  ): MockUser => {
    const u: MockUser = { id, email, username, name, role, phone, avatarUrl: null, createdAt: iso(now) };
    users.push(u);
    passwords[id] = MOCK_PASSWORD;
    return u;
  };

  const admin = mkUser("u-admin", "admin@school.test", "admin", "Ama Mensah (Head)", Role.ADMIN, "0244000000");

  const teacherSeed: [string, string, string, string, string][] = [
    ["u-sarah", "sarah@school.test", "sarah", "Sarah Owusu", "0201111111"],
    ["u-mike", "mike@school.test", "mike", "Michael Adjei", "0202222222"],
    ["u-grace", "grace@school.test", "grace", "Grace Boateng", "0203333333"],
    ["u-kwame", "kwame@school.test", "kwame", "Kwame Asante", "0204444444"],
    ["u-efua", "efua@school.test", "efua", "Efua Darko", "0205555555"],
    ["u-yaw", "yaw@school.test", "yaw", "Yaw Ofori", "0206666666"],
    ["u-abena", "abena@school.test", "abena", "Abena Nyarko", "0207777777"],
    ["u-kojo", "kojo@school.test", "kojo", "Kojo Mensah", "0208888888"],
  ];
  const teachers = teacherSeed.map(([id, email, un, name, phone]) =>
    mkUser(id, email, un, name, Role.TEACHER, phone),
  );
  const teacherAt = (i: number): MockUser => teachers[i % teachers.length]!;
  const teacher = teacherAt(0);

  const parentSeed: [string, string, string, string][] = [
    ["u-john", "john@parent.test", "John Bello", "0244333333"],
    ["u-mary", "mary@parent.test", "Mary Musa", "0244444444"],
    ["u-peter", "peter@parent.test", "Peter Anane", "0244555555"],
    ["u-linda", "linda@parent.test", "Linda Quaye", "0244666666"],
    ["u-samuel", "samuel@parent.test", "Samuel Tetteh", "0244777777"],
    ["u-rita", "rita@parent.test", "Rita Addo", "0244888888"],
  ];
  const parents = parentSeed.map(([id, email, name, phone]) =>
    mkUser(id, email, null, name, Role.PARENT, phone),
  );
  const parentAt = (i: number): MockUser => parents[i % parents.length]!;
  const john = parentAt(0);
  const mary = parentAt(1);

  // ---- subjects ----
  const subjectSeed: [string, string][] = [
    ["Mathematics", "MATH"], ["English Language", "ENG"], ["Integrated Science", "SCI"],
    ["Social Studies", "SOC"], ["Creative Arts", "ART"], ["Religious & Moral Education", "RME"],
    ["ICT", "ICT"], ["Ghanaian Language", "GHL"], ["Physical Education", "PE"], ["Music", "MUS"],
  ];
  const teachingSubjects: MockSubject[] = subjectSeed.map(([name, code], i) => ({
    id: `sub-${i + 1}`, name, code, isActivity: false,
  }));
  const subjectAt = (i: number): MockSubject => teachingSubjects[i % teachingSubjects.length]!;
  const lunch: MockSubject = { id: "sub-lunch", name: "Lunch", code: null, isActivity: true };
  const worship: MockSubject = { id: "sub-worship", name: "Worship", code: null, isActivity: true };
  const subjects = [...teachingSubjects, lunch, worship];
  const subjectNames = teachingSubjects.map((s) => s.name);

  // ---- classes ----
  const nurserySubjects = ["Mathematics", "English Language", "Creative Arts", "Music"];
  const primarySubjects = [
    "Mathematics", "English Language", "Integrated Science", "Social Studies",
    "Creative Arts", "Religious & Moral Education", "ICT", "Ghanaian Language",
  ];
  const classDefs: { name: string; level: string; subjects: string[] }[] = [
    { name: "Nursery", level: "NURSERY", subjects: nurserySubjects },
    { name: "KG 1", level: "NURSERY", subjects: nurserySubjects },
    { name: "KG 2", level: "NURSERY", subjects: nurserySubjects },
    { name: "Primary 1", level: "PRIMARY", subjects: primarySubjects },
    { name: "Primary 2", level: "PRIMARY", subjects: primarySubjects },
    { name: "Primary 3", level: "PRIMARY", subjects: primarySubjects },
    { name: "Primary 4", level: "PRIMARY", subjects: primarySubjects },
    { name: "Primary 5", level: "PRIMARY", subjects: primarySubjects },
    { name: "Primary 6", level: "PRIMARY", subjects: primarySubjects },
    { name: "JHS 1", level: "JUNIOR", subjects: subjectNames },
    { name: "JHS 2", level: "JUNIOR", subjects: subjectNames },
    { name: "JHS 3", level: "JUNIOR", subjects: subjectNames },
  ];
  const classes: MockClass[] = classDefs.map((def, i) => ({
    id: `cls-${i}`,
    name: def.name,
    level: def.level,
    homeroomTeacherId: teacherAt(i).id,
    studentCount: 20 + ((i * 3) % 18),
    subjectsOffered: def.subjects.join(", "),
  }));
  const classAt = (i: number): MockClass => classes[i]!;

  // ---- students + guardianships ----
  const firstNames = [
    "Tunde", "Ada", "Zainab", "Kofi", "Akua", "Kwesi", "Adjoa", "Yaw", "Ama",
    "Nana", "Esi", "Kojo", "Abena", "Kwabena", "Afia", "Kwame", "Akosua",
    "Fiifi", "Maabena", "Kojoe", "Serwaa", "Kukua", "Kwadwo", "Araba", "Ekow",
    "Baaba", "Paa", "Efe", "Dela", "Sena", "Mawuli", "Elikem", "Selorm",
  ];
  const lastNames = [
    "Bello", "Musa", "Anane", "Quaye", "Tetteh", "Addo", "Owusu", "Adjei",
    "Boateng", "Asante", "Darko", "Ofori", "Nyarko", "Mensah", "Appiah",
  ];
  const addresses = [
    "12 Palm Avenue, East Legon — opposite the blue water tank",
    "House 4, Adenta Housing Down — near St. Peter's Church",
    "GPS: GA-123-4567, Dansoman Estate",
    "Behind Melcom, Madina Zongo Junction",
    "Plot 8, Spintex Road — beside the yellow filling station",
    "No. 21 Ridge Street, Tema Community 5",
  ];
  const pick = (arr: string[], i: number): string => arr[i % arr.length]!;

  const students: MockStudent[] = [];
  const guardianships: MockGuardianship[] = [];
  const studentParent: Record<string, MockUser> = {};
  const studentClassIndex: Record<string, number> = {};
  let admNo = 1;
  for (let ci = 0; ci < classes.length; ci++) {
    const perClass = 3 + (ci % 3);
    for (let k = 0; k < perClass; k++) {
      const isNursery = classAt(ci).level === "NURSERY";
      const parent = parentAt(ci + k);
      const id = `st-${admNo}`;
      const s: MockStudent = {
        id,
        admissionNo: `STU-${String(admNo).padStart(3, "0")}`,
        firstName: pick(firstNames, ci * 5 + k),
        lastName: pick(lastNames, ci + k),
        dob: dateOnly(new Date(2010 + ci, (k * 2) % 12, ((k + 1) * 3) % 28 || 1)).toISOString(),
        isFirstTime: isNursery && k === 0,
        classId: classAt(ci).id,
        guardianName: parent.name,
        guardianPhone: parent.phone,
        secondaryGuardianName: k % 2 === 0 ? "Grace Bello" : "Ibrahim Musa",
        secondaryGuardianPhone: k % 2 === 0 ? "0209990000" : "0209991111",
        address: pick(addresses, ci + k),
        photoUrl: null,
      };
      students.push(s);
      studentParent[id] = parent;
      studentClassIndex[id] = ci;
      admNo++;
    }
  }
  const studentAt = (i: number): MockStudent => students[i]!;
  const tunde = studentAt(0);
  const ada = studentAt(1);
  const zainab = studentAt(2);
  guardianships.push(
    { id: nextId("g"), parentUserId: john.id, studentId: tunde.id, relation: "Father" },
    { id: nextId("g"), parentUserId: john.id, studentId: ada.id, relation: "Father" },
    { id: nextId("g"), parentUserId: mary.id, studentId: zainab.id, relation: "Mother" },
  );
  for (let i = 3; i < students.length; i++) {
    const s = studentAt(i);
    guardianships.push({
      id: nextId("g"),
      parentUserId: studentParent[s.id]!.id,
      studentId: s.id,
      relation: i % 2 ? "Mother" : "Father",
    });
  }

  // ---- timetable ----
  const days = ["MON", "TUE", "WED", "THU", "FRI"];
  const periodTimes: Record<number, [string, string]> = {
    1: ["08:00", "08:45"], 2: ["08:45", "09:30"], 3: ["09:45", "10:30"],
    4: ["10:30", "11:15"], 5: ["11:30", "12:15"], 6: ["12:15", "13:00"],
  };
  const slots: MockSlot[] = [];
  for (let ci = 0; ci < classes.length; ci++) {
    for (let di = 0; di < days.length; di++) {
      for (let period = 1; period <= 4; period++) {
        const subject = subjectAt(ci + di + period);
        const t = teacherAt(ci + period);
        const [startTime, endTime] = periodTimes[period]!;
        slots.push({
          id: nextId("slot"), classId: classAt(ci).id, subjectId: subject.id,
          teacherId: t.id, day: days[di]!, period, startTime, endTime,
        });
      }
      const [lunchStart, lunchEnd] = periodTimes[6]!;
      slots.push({
        id: nextId("slot"), classId: classAt(ci).id, subjectId: lunch.id,
        teacherId: null, day: days[di]!, period: 6, startTime: lunchStart, endTime: lunchEnd,
      });
    }
    const [worshipStart, worshipEnd] = periodTimes[5]!;
    slots.push({
      id: nextId("slot"), classId: classAt(ci).id, subjectId: worship.id,
      teacherId: null, day: "MON", period: 5, startTime: worshipStart, endTime: worshipEnd,
    });
  }

  // ---- attendance + alerts ----
  const schoolDays = recentWeekdays(15);
  const attendance: MockAttendance[] = [];
  const alerts: MockAlert[] = [];
  for (let si = 0; si < students.length; si++) {
    const marker = teacherAt(si).id;
    const absenceProne = si % 3 === 0;
    for (let d = 0; d < schoolDays.length; d++) {
      const roll = (si * 7 + d * 3) % 10;
      const status = absenceProne && roll === 0 ? "ABSENT" : roll === 1 ? "LATE" : "PRESENT";
      attendance.push({
        id: nextId("att"), studentId: studentAt(si).id,
        date: schoolDays[d]!.toISOString(), status, markedById: marker,
      });
    }
  }

  // Zainab absent today with a pending alert.
  const today = dateOnly(new Date());
  const zainabToday: MockAttendance = {
    id: nextId("att"), studentId: zainab.id, date: today.toISOString(),
    status: "ABSENT", markedById: teacher.id,
  };
  attendance.push(zainabToday);
  alerts.push({
    id: nextId("alert"), attendanceId: zainabToday.id,
    message: "Zainab is not at school today. Please let us know why.",
    status: "PENDING", parentReason: null, respondedAt: null, createdAt: iso(now),
  });

  // Ada — an earlier absence, already responded to.
  const adaAbsence = attendance.find((a) => a.studentId === ada.id && a.status === "ABSENT");
  if (adaAbsence) {
    alerts.push({
      id: nextId("alert"), attendanceId: adaAbsence.id,
      message: "Ada was absent. Please let us know why.",
      status: "RESPONDED", parentReason: "She had a hospital appointment.",
      respondedAt: iso(now), createdAt: iso(daysAgo(2)),
    });
  }

  // ---- media (a few photos for the demo children) ----
  const media: MockMedia[] = [];
  const mediaSeed: [MockStudent, string, number][] = [
    [tunde, "Art class masterpiece", 20],
    [tunde, "Story time on the mat", 120],
    [ada, "Sports day sprint", 200],
    [zainab, "Building blocks tower", 280],
  ];
  mediaSeed.forEach(([s, caption, hue], i) => {
    media.push({
      id: nextId("media"), studentId: s.id, teacherId: teacher.id,
      fileUrl: photo(caption, hue), caption, createdAt: iso(daysAgo(i + 1)),
    });
  });

  // ---- term reports + marks ----
  const termReports: MockTermReport[] = [];
  const marks: MockMark[] = [];
  const ord = (n: number) => n === 1 ? "1st" : n === 2 ? "2nd" : n === 3 ? "3rd" : `${n}th`;
  const termDefs = [
    {
      term: "First Term", daysAgoCreated: 90,
      scoreOffset: 0, scoreMul1: 7, scoreMul2: 11,
      progress: "Settled in well and is actively participating in class activities.",
      interest: "Shows strong interest in Mathematics and English Language.",
      strength: "Excellent attendance and positive attitude towards learning.",
      howParentsCanHelp: "Encourage reading for 15–20 minutes each evening and review class notes together.",
    },
    {
      term: "Second Term", daysAgoCreated: 45,
      scoreOffset: 3, scoreMul1: 5, scoreMul2: 9,
      progress: "Showing steady improvement across all subjects this term.",
      interest: "Particularly engaged during Science and Creative Arts lessons.",
      strength: "Critical thinking and strong problem-solving ability.",
      howParentsCanHelp: "Provide a quiet study space and check homework completion daily.",
    },
    {
      term: "Third Term", daysAgoCreated: 10,
      scoreOffset: 5, scoreMul1: 6, scoreMul2: 13,
      progress: "Has demonstrated commendable growth across the academic year.",
      interest: "Excels in group work and enjoys Social Studies discussions.",
      strength: "Leadership skills and the ability to help classmates understand concepts.",
      howParentsCanHelp: "Celebrate achievements and encourage summer reading to maintain momentum.",
    },
  ];
  for (const td of termDefs) {
    for (let i = 0; i < Math.min(12, students.length); i++) {
      const classSize = students.filter((s) => s.classId === studentAt(i).classId).length;
      const position = (i % Math.max(classSize, 1)) + 1;
      const report: MockTermReport = {
        id: nextId("rep"), studentId: studentAt(i).id, term: td.term,
        year: 2026, fileUrl: null, classId: studentAt(i).classId, promotedToClassId: null,
        reopenDate: null, promotionAppliedAt: null,
        positionInClass: `${ord(position)} out of ${classSize}`,
        progress: td.progress, interest: td.interest,
        strength: td.strength, howParentsCanHelp: td.howParentsCanHelp,
        createdAt: iso(daysAgo(td.daysAgoCreated)),
      };
      termReports.push(report);
      teachingSubjects.slice(0, 5).forEach((sub, j) => {
        const score = Math.min(100, 55 + td.scoreOffset + ((i * td.scoreMul1 + j * td.scoreMul2) % 40));
        marks.push({
          id: nextId("mark"), termReportId: report.id, subjectId: sub.id, score,
          grade: score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : "D",
          comment: score >= 80 ? "Excellent" : score >= 65 ? "Good progress" : "Needs support",
        });
      });
    }
  }

  // ---- progress reports ----
  const progress: MockProgress[] = [];
  for (let i = 0; i < Math.min(8, students.length); i++) {
    progress.push({
      id: nextId("prog"), studentId: studentAt(i).id,
      teacherId: teacherAt(i).id, term: "First Term",
      strengths: "Strong focus during lessons and works well with peers.",
      talents: "Shows a clear talent for drawing and storytelling.",
      needs: "Encourage more reading practice at home.",
      howParentsCanHelp: "Read together for 15 minutes each evening and praise effort.",
      createdAt: iso(daysAgo(7)),
    });
  }

  // ---- invoices + payments ----
  const invoices: MockInvoice[] = [];
  const payments: MockPayment[] = [];
  for (let i = 0; i < students.length; i++) {
    const s = studentAt(i);
    const level = classAt(studentClassIndex[s.id]!).level;
    const amount = level === "JUNIOR" ? 90000 : level === "PRIMARY" ? 70000 : 50000;
    const mode = i % 3;
    const inv: MockInvoice = {
      id: nextId("inv"), studentId: s.id, term: "First Term 2026",
      amount, dueDate: new Date("2026-09-30").toISOString(),
      status: mode === 0 ? "PAID" : mode === 1 ? "PARTIAL" : "UNPAID", createdAt: iso(daysAgo(20)),
    };
    invoices.push(inv);
    if (mode === 0) {
      payments.push({ id: nextId("pay"), invoiceId: inv.id, amount, method: "bank", createdAt: iso(daysAgo(15)) });
    } else if (mode === 1) {
      payments.push({ id: nextId("pay"), invoiceId: inv.id, amount: Math.round(amount / 2), method: "momo", createdAt: iso(daysAgo(15)) });
    }
  }

  // ---- messages ----
  const messages: MockMessage[] = [];
  const messageSeed: [MockUser, MockUser, string][] = [
    [john, admin, "Good morning, please what time is closing today?"],
    [admin, john, "Good morning! Closing is at 3:00pm today."],
    [mary, teacher, "Thank you for the update on Zainab."],
    [teacher, mary, "You're welcome. We'll keep you posted."],
    [parentAt(2), teacherAt(1), "Is there homework for the weekend?"],
  ];
  messageSeed.forEach(([from, to, body], i) => {
    messages.push({
      id: nextId("msg"), senderId: from.id, receiverId: to.id, body,
      createdAt: iso(new Date(now.getTime() - (messageSeed.length - i) * 3600_000)),
      readAt: iso(now),
    });
  });

  // ---- notifications ----
  const notifications: MockNotification[] = [
    { id: nextId("ntf"), userId: mary.id, type: "ABSENCE_ALERT", title: "Zainab is marked absent", body: "Please let us know why.", data: null, readAt: null, createdAt: iso(now) },
    { id: nextId("ntf"), userId: john.id, type: "REPORT", title: "New term report available", body: "Tunde's First Term report is ready.", data: null, readAt: null, createdAt: iso(daysAgo(1)) },
    { id: nextId("ntf"), userId: john.id, type: "INVOICE", title: "New invoice", body: "First Term 2026 fees have been issued.", data: null, readAt: iso(now), createdAt: iso(daysAgo(3)) },
  ];

  return {
    users, passwords, classes, subjects, students, guardianships, slots, attendance,
    alerts, media, termReports, marks, progress, invoices, payments, messages, notifications,
  };
}

// A single dataset per app instance; mutations persist for the session.
let db: MockDb | null = null;
function getDb(): MockDb {
  if (!db) db = buildDb();
  return db;
}

// ---------------------------------------------------------------- errors -----
function fail(status: number, error: string): never {
  const e = new Error(error) as Error & { status: number; data: { error: string } };
  e.status = status;
  e.data = { error };
  throw e;
}

// ------------------------------------------------------------ join helpers ---
const pub = (u: MockUser) => ({
  id: u.id, email: u.email, username: u.username, name: u.name,
  role: u.role, phone: u.phone, avatarUrl: u.avatarUrl, createdAt: u.createdAt,
});
const teacherRef = (d: MockDb, id: string | null) => {
  const u = d.users.find((x) => x.id === id);
  return u ? { id: u.id, name: u.name } : null;
};
const subjectRef = (d: MockDb, id: string) => {
  const s = d.subjects.find((x) => x.id === id);
  return s ? { id: s.id, name: s.name } : null;
};
const classRef = (d: MockDb, id: string | null) => {
  const c = d.classes.find((x) => x.id === id);
  return c ? { id: c.id, name: c.name, level: c.level, homeroomTeacherId: c.homeroomTeacherId } : null;
};
function classFull(d: MockDb, c: MockClass) {
  return {
    ...c,
    homeroomTeacher: teacherRef(d, c.homeroomTeacherId),
    _count: { students: d.students.filter((s) => s.classId === c.id).length },
  };
}
function guardianshipsFor(d: MockDb, studentId: string) {
  return d.guardianships
    .filter((g) => g.studentId === studentId)
    .map((g) => {
      const p = d.users.find((u) => u.id === g.parentUserId);
      return {
        ...g,
        parent: p ? { id: p.id, name: p.name, email: p.email, phone: p.phone } : null,
      };
    });
}
function studentFull(d: MockDb, s: MockStudent) {
  return { ...s, class: classRef(d, s.classId), guardianships: guardianshipsFor(d, s.id) };
}
function alertFull(d: MockDb, a: MockAlert) {
  const att = d.attendance.find((x) => x.id === a.attendanceId);
  const st = att && d.students.find((s) => s.id === att.studentId);
  return {
    ...a,
    attendance: att
      ? {
          ...att,
          student: st
            ? { id: st.id, firstName: st.firstName, lastName: st.lastName, photoUrl: st.photoUrl }
            : null,
        }
      : null,
  };
}
function invoiceFull(d: MockDb, inv: MockInvoice) {
  const st = d.students.find((s) => s.id === inv.studentId);
  return {
    ...inv,
    payments: d.payments.filter((p) => p.invoiceId === inv.id),
    student: st ? { id: st.id, firstName: st.firstName, lastName: st.lastName } : null,
  };
}
function reportFull(d: MockDb, r: MockTermReport) {
  const totalStudents = r.classId ? d.students.filter((s) => s.classId === r.classId).length : null;
  return {
    ...r,
    class: classRef(d, r.classId),
    promotedToClass: classRef(d, r.promotedToClassId),
    marks: d.marks
      .filter((m) => m.termReportId === r.id)
      .map((m) => ({ ...m, subject: subjectRef(d, m.subjectId) })),
    totalStudents,
  };
}
const mediaFull = (d: MockDb, m: MockMedia) => ({ ...m, teacher: teacherRef(d, m.teacherId) });
const progressFull = (d: MockDb, p: MockProgress) => ({ ...p, teacher: teacherRef(d, p.teacherId) });

function parentStudentIds(d: MockDb, userId: string) {
  return d.guardianships.filter((g) => g.parentUserId === userId).map((g) => g.studentId);
}
function assertOwns(d: MockDb, userId: string, studentId: string) {
  if (!parentStudentIds(d, userId).includes(studentId)) fail(403, "Not your child");
}
/** Push a notification to every guardian linked to a student. Mirrors the API's notify(). */
function notifyGuardians(
  d: MockDb,
  studentId: string,
  opts: { type: string; title: string; body?: string; data?: Record<string, unknown> },
) {
  const guardianIds = d.guardianships
    .filter((g) => g.studentId === studentId)
    .map((g) => g.parentUserId);
  guardianIds.forEach((userId) => {
    d.notifications.push({
      id: nextId("ntf"),
      userId,
      type: opts.type,
      title: opts.title,
      body: opts.body ?? null,
      data: opts.data ?? null,
      readAt: null,
      createdAt: new Date().toISOString(),
    });
  });
  return guardianIds.length;
}
/**
 * Move students up once their end-of-year report's reopen date has arrived.
 * Mirrors the API's applyDuePromotions(): each promotion is applied exactly
 * once, guarded by `promotionAppliedAt`. Runs on every request so the mock
 * reflects promotions without a background scheduler.
 */
function applyDuePromotions(d: MockDb, now = new Date()) {
  for (const r of d.termReports) {
    if (!r.promotedToClassId || r.promotionAppliedAt || !r.reopenDate) continue;
    if (new Date(r.reopenDate) > now) continue;
    const student = d.students.find((s) => s.id === r.studentId);
    if (student) student.classId = r.promotedToClassId;
    r.promotionAppliedAt = now.toISOString();
    const cls = d.classes.find((c) => c.id === r.promotedToClassId);
    notifyGuardians(d, r.studentId, {
      type: "STUDENT_PROMOTED",
      title: `${student?.firstName ?? "Your child"} has moved up to ${cls?.name ?? "the next class"}`,
      data: { studentId: r.studentId },
    });
  }
}
function fakeTokens() {
  return { accessToken: `mock-access-${Date.now()}`, refreshToken: `mock-refresh-${Date.now()}` };
}
function readForm(body: unknown, key: string): string | undefined {
  if (typeof FormData !== "undefined" && body instanceof FormData) {
    const v = body.get(key);
    return typeof v === "string" ? v : undefined;
  }
  return (body as Record<string, string> | null | undefined)?.[key];
}
const dayOrder = (day: string): number => ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"].indexOf(day);

export interface MockSessionUser { id: string; role: Role; name: string }

// ---------------------------------------------------------------- router -----
export async function handleMockRequest(
  method: string,
  url: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
  user: MockSessionUser | null,
): Promise<unknown> {
  const d = getDb();
  // Apply any promotions whose reopen date has passed before serving a request.
  applyDuePromotions(d);
  const qIdx = url.indexOf("?");
  const path = (qIdx >= 0 ? url.slice(0, qIdx) : url).replace(/\/+$/, "") || "/";
  const q: Record<string, string | undefined> = Object.fromEntries(
    new URLSearchParams(qIdx >= 0 ? url.slice(qIdx + 1) : ""),
  );
  const m = method.toUpperCase();
  const nowIso = new Date().toISOString();
  const seg = path.split("/").filter(Boolean);
  const seg1 = seg[1] ?? "";
  const seg2 = seg[2] ?? "";
  const sid = q.studentId ?? "";

  const need = (): MockSessionUser => (user ? user : fail(401, "Not authenticated"));

  // ---------------- auth ----------------
  if (path === "/auth/login" && m === "POST") {
    const { email, username, password } = body ?? {};
    const found = d.users.find((u) =>
      email ? u.email === email : username ? u.username === username : false,
    );
    if (!found || d.passwords[found.id] !== password) return fail(401, "Invalid credentials");
    return { user: pub(found), ...fakeTokens() };
  }
  if (path === "/auth/register" && m === "POST") {
    const { email, password, name, phone } = body ?? {};
    if (d.users.some((u) => u.email === email)) fail(409, "A record with these details already exists.");
    const u: MockUser = {
      id: nextId("u"), email, username: null, name, role: Role.PARENT,
      phone: phone ?? null, avatarUrl: null, createdAt: nowIso,
    };
    d.users.push(u);
    d.passwords[u.id] = password;
    return { user: pub(u), ...fakeTokens() };
  }
  if (path === "/auth/refresh" && m === "POST") {
    const u = user ? d.users.find((x) => x.id === user.id) : undefined;
    if (!u) return fail(401, "Session expired, please log in again");
    return { user: pub(u), ...fakeTokens() };
  }
  if (path === "/auth/logout" && m === "POST") return null;
  if (path === "/auth/me" && m === "GET") {
    const u = d.users.find((x) => x.id === need().id);
    if (!u) return fail(404, "User not found");
    return { user: pub(u) };
  }

  // ---------------- students ----------------
  if (path === "/students/mine" && m === "GET") {
    const ids = parentStudentIds(d, need().id);
    const list = d.students
      .filter((s) => ids.includes(s.id))
      .sort((a, b) => a.firstName.localeCompare(b.firstName))
      .map((s) => ({ ...s, class: classRef(d, s.classId) }));
    return { students: list };
  }
  if (path === "/students" && m === "GET") {
    need();
    const list = d.students
      .filter((s) => (q.classId ? s.classId === q.classId : true))
      .sort((a, b) => a.firstName.localeCompare(b.firstName))
      .map((s) => studentFull(d, s));
    return { students: list };
  }
  if (path === "/students" && m === "POST") {
    const s: MockStudent = {
      id: nextId("st"),
      admissionNo: body.admissionNo || `ADM-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      firstName: body.firstName, lastName: body.lastName,
      dob: body.dob ? new Date(body.dob).toISOString() : nowIso,
      isFirstTime: !!body.isFirstTime, classId: body.classId ?? null,
      guardianName: body.guardianName ?? null, guardianPhone: body.guardianPhone ?? null,
      secondaryGuardianName: body.secondaryGuardianName ?? null,
      secondaryGuardianPhone: body.secondaryGuardianPhone ?? null,
      address: body.address ?? null, photoUrl: null,
    };
    d.students.push(s);
    return { student: studentFull(d, s) };
  }
  if (path === "/students/guardianships" && m === "POST") {
    const parent = d.users.find((u) => u.id === body.parentUserId);
    if (!parent || parent.role !== Role.PARENT) fail(400, "Selected user is not a parent account");
    const g: MockGuardianship = {
      id: nextId("g"), parentUserId: body.parentUserId, studentId: body.studentId, relation: body.relation,
    };
    d.guardianships.push(g);
    return { guardianship: g };
  }
  if (seg[0] === "students" && seg[1] === "guardianships" && seg[2] && m === "DELETE") {
    d.guardianships = d.guardianships.filter((g) => g.id !== seg2);
    return null;
  }
  if (seg[0] === "students" && seg[2] === "photo" && m === "POST") {
    const s = d.students.find((x) => x.id === seg1);
    if (!s) return fail(404, "Student not found");
    s.photoUrl = photo(s.firstName, 210);
    return { student: studentFull(d, s) };
  }
  if (seg[0] === "students" && seg[2] === "share-profile" && m === "POST") {
    need();
    const s = d.students.find((x) => x.id === seg1);
    if (!s) return fail(404, "Student not found");
    const cls = classRef(d, s.classId);
    const count = notifyGuardians(d, s.id, {
      type: "PROFILE_SHARED",
      title: `${s.firstName} ${s.lastName}'s profile`,
      body: `Admission No ${s.admissionNo} · ${cls?.name ?? "No class"}`,
      data: { studentId: s.id },
    });
    return { shared: count };
  }
  if (seg[0] === "students" && seg.length === 2 && m === "GET") {
    const u = need();
    if (u.role === Role.PARENT) assertOwns(d, u.id, seg1);
    const s = d.students.find((x) => x.id === seg1);
    if (!s) return fail(404, "Student not found");
    return { student: studentFull(d, s) };
  }
  if (seg[0] === "students" && seg.length === 2 && m === "PATCH") {
    const s = d.students.find((x) => x.id === seg1);
    if (!s) return fail(404, "Student not found");
    Object.assign(s, body);
    return { student: studentFull(d, s) };
  }
  if (seg[0] === "students" && seg.length === 2 && m === "DELETE") {
    d.students = d.students.filter((x) => x.id !== seg1);
    return null;
  }

  // ---------------- classes ----------------
  if (path === "/classes" && m === "GET") {
    need();
    const list = [...d.classes]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => classFull(d, c));
    return { classes: list };
  }
  if (path === "/classes" && m === "POST") {
    const c: MockClass = {
      id: nextId("cls"), name: body.name, level: body.level,
      homeroomTeacherId: body.homeroomTeacherId ?? null,
      studentCount: body.studentCount ?? null, subjectsOffered: body.subjectsOffered ?? null,
    };
    d.classes.push(c);
    return { class: classFull(d, c) };
  }
  if (seg[0] === "classes" && seg[1] && m === "GET") {
    const c = d.classes.find((x) => x.id === seg1);
    if (!c) return fail(404, "Class not found");
    return {
      class: {
        ...classFull(d, c),
        students: d.students
          .filter((s) => s.classId === c.id)
          .sort((a, b) => a.firstName.localeCompare(b.firstName)),
      },
    };
  }
  if (seg[0] === "classes" && seg[1] && m === "PATCH") {
    const c = d.classes.find((x) => x.id === seg1);
    if (!c) return fail(404, "Class not found");
    Object.assign(c, body);
    return { class: classFull(d, c) };
  }
  if (seg[0] === "classes" && seg[1] && m === "DELETE") {
    d.classes = d.classes.filter((x) => x.id !== seg1);
    return null;
  }

  // ---------------- subjects ----------------
  if (path === "/subjects" && m === "GET") {
    need();
    return { subjects: [...d.subjects].sort((a, b) => a.name.localeCompare(b.name)) };
  }
  if (path === "/subjects" && m === "POST") {
    const s: MockSubject = { id: nextId("sub"), name: body.name, code: body.code ?? null, isActivity: !!body.isActivity };
    d.subjects.push(s);
    return { subject: s };
  }
  if (seg[0] === "subjects" && seg[1] && m === "PATCH") {
    need();
    const s = d.subjects.find((x) => x.id === seg1);
    if (!s) return fail(404, "Subject not found");
    if (body.name !== undefined) s.name = body.name;
    if (body.code !== undefined) s.code = body.code;
    return { subject: s };
  }
  if (seg[0] === "subjects" && seg[1] && m === "DELETE") {
    d.subjects = d.subjects.filter((x) => x.id !== seg1);
    return null;
  }

  // ---------------- timetable ----------------
  if (path === "/timetable" && m === "GET") {
    const u = need();
    let classId = q.classId;
    if (q.studentId) {
      if (u.role === Role.PARENT) assertOwns(d, u.id, sid);
      classId = d.students.find((s) => s.id === q.studentId)?.classId ?? undefined;
    }
    if (u.role === Role.PARENT && !q.studentId && parentStudentIds(d, u.id).length === 0) {
      return { slots: [] };
    }
    const list = d.slots
      .filter((s) => (classId ? s.classId === classId : true))
      .sort((a, b) => (a.day === b.day ? a.period - b.period : dayOrder(a.day) - dayOrder(b.day)))
      .map((s) => ({
        ...s, subject: subjectRef(d, s.subjectId), teacher: teacherRef(d, s.teacherId), class: classRef(d, s.classId),
      }));
    return { slots: list };
  }
  if (path === "/timetable" && m === "POST") {
    const { repeat, ...data } = body;
    if (repeat) {
      let count = 0;
      for (const day of ["MON", "TUE", "WED", "THU", "FRI"]) {
        const dup = d.slots.some((s) => s.classId === data.classId && s.day === day && s.startTime === data.startTime);
        if (!dup) {
          d.slots.push({ id: nextId("slot"), teacherId: null, period: 1, ...data, day });
          count++;
        }
      }
      return { count };
    }
    const dup = d.slots.some((s) => s.classId === data.classId && s.day === data.day && s.startTime === data.startTime);
    if (dup) fail(409, "A slot already exists at that time on that day.");
    const slot: MockSlot = { id: nextId("slot"), teacherId: null, ...data };
    d.slots.push(slot);
    return { slot };
  }
  if (seg[0] === "timetable" && seg[1] && m === "DELETE") {
    d.slots = d.slots.filter((s) => s.id !== seg1);
    return null;
  }

  // ---------------- attendance ----------------
  if (path === "/attendance/roster" && m === "GET") {
    need();
    const date = q.date ? dateOnly(new Date(q.date)) : dateOnly(new Date());
    const isoDate = date.toISOString();
    const list = d.students
      .filter((s) => s.classId === q.classId)
      .sort((a, b) => a.firstName.localeCompare(b.firstName))
      .map((s) => ({
        ...s,
        attendance: d.attendance
          .filter((a) => a.studentId === s.id && a.date === isoDate)
          .map((a) => ({ ...a, alert: d.alerts.find((al) => al.attendanceId === a.id) ?? null })),
      }));
    return { date: isoDate, students: list };
  }
  if (path === "/attendance/summary" && m === "GET") {
    need();
    const date = q.date ? dateOnly(new Date(q.date)) : dateOnly(new Date());
    const isoDate = date.toISOString();
    const list = [...d.classes]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => {
        const ids = d.students.filter((s) => s.classId === c.id).map((s) => s.id);
        const recs = d.attendance.filter((a) => a.date === isoDate && ids.includes(a.studentId));
        return {
          id: c.id, name: c.name, level: c.level, homeroomTeacherId: c.homeroomTeacherId,
          total: ids.length,
          present: recs.filter((r) => r.status === "PRESENT").length,
          absent: recs.filter((r) => r.status === "ABSENT").length,
          late: recs.filter((r) => r.status === "LATE").length,
        };
      });
    return { date: isoDate, classes: list };
  }
  if (path === "/attendance" && m === "GET") {
    const u = need();
    if (u.role === Role.PARENT) assertOwns(d, u.id, sid);
    const list = d.attendance
      .filter((a) => a.studentId === q.studentId)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 60)
      .map((a) => ({ ...a, alert: d.alerts.find((al) => al.attendanceId === a.id) ?? null }));
    return { records: list };
  }
  if (path === "/attendance" && m === "POST") {
    const u = need();
    const date = dateOnly(body.date ? new Date(body.date) : new Date()).toISOString();
    let rec = d.attendance.find((a) => a.studentId === body.studentId && a.date === date);
    if (rec) { rec.status = body.status; rec.markedById = u.id; }
    else {
      rec = { id: nextId("att"), studentId: body.studentId, date, status: body.status, markedById: u.id };
      d.attendance.push(rec);
    }
    return { record: { ...rec, alert: d.alerts.find((al) => al.attendanceId === rec!.id) ?? null } };
  }
  if (seg[0] === "attendance" && seg[2] === "alert" && m === "POST") {
    const att = d.attendance.find((a) => a.id === seg1);
    if (!att) return fail(404, "Attendance record not found");
    if (att.status !== "ABSENT") fail(400, "Alerts can only be raised for absent students");
    if (d.alerts.some((al) => al.attendanceId === att.id)) fail(409, "An alert has already been raised");
    const alert: MockAlert = {
      id: nextId("alert"), attendanceId: att.id, message: body.message,
      status: "PENDING", parentReason: null, respondedAt: null, createdAt: nowIso,
    };
    d.alerts.push(alert);
    return { alert };
  }

  // ---------------- absence alerts ----------------
  if (path === "/absence-alerts" && m === "GET") {
    const u = need();
    let list = d.alerts;
    if (u.role === Role.PARENT) {
      const ids = parentStudentIds(d, u.id);
      list = list.filter((a) => {
        const att = d.attendance.find((x) => x.id === a.attendanceId);
        return !!att && ids.includes(att.studentId);
      });
    }
    const out = [...list]
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 50)
      .map((a) => alertFull(d, a));
    return { alerts: out };
  }
  if (seg[0] === "absence-alerts" && seg[2] === "respond" && m === "POST") {
    const a = d.alerts.find((x) => x.id === seg1);
    if (!a) return fail(404, "Alert not found");
    if (a.status === "RESPONDED") fail(409, "You have already responded to this alert");
    a.parentReason = body.parentReason;
    a.status = "RESPONDED";
    a.respondedAt = nowIso;
    return { alert: a };
  }

  // ---------------- media ----------------
  if (path === "/media" && m === "GET") {
    const u = need();
    if (u.role === Role.PARENT) assertOwns(d, u.id, sid);
    const list = d.media
      .filter((x) => x.studentId === q.studentId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((x) => mediaFull(d, x));
    return { media: list };
  }
  if (path === "/media" && m === "POST") {
    const studentId = readForm(body, "studentId") ?? "";
    const caption = readForm(body, "caption") ?? null;
    const share: MockMedia = {
      id: nextId("media"), studentId, teacherId: need().id,
      fileUrl: photo(caption || "Photo", (counter * 47) % 360), caption, createdAt: nowIso,
    };
    d.media.push(share);
    return { media: mediaFull(d, share) };
  }
  if (seg[0] === "media" && seg[1] && m === "DELETE") {
    d.media = d.media.filter((x) => x.id !== seg1);
    return null;
  }

  // ---------------- reports ----------------
  if (path === "/reports" && m === "GET") {
    const u = need();
    if (u.role === Role.PARENT) assertOwns(d, u.id, sid);
    const list = d.termReports
      .filter((r) => r.studentId === q.studentId)
      .sort((a, b) => (b.year - a.year) || b.term.localeCompare(a.term))
      .map((r) => reportFull(d, r));
    return { reports: list };
  }
  if (path === "/reports" && m === "POST") {
    const student = d.students.find((s) => s.id === body.studentId);
    const report: MockTermReport = {
      id: nextId("rep"), studentId: body.studentId, term: body.term,
      year: body.year, fileUrl: null, classId: student?.classId ?? null,
      promotedToClassId: body.promotedToClassId ?? null,
      reopenDate: body.reopenDate ? new Date(body.reopenDate).toISOString() : null,
      promotionAppliedAt: null,
      positionInClass: body.positionInClass ?? null, progress: body.progress ?? null,
      interest: body.interest ?? null, strength: body.strength ?? null,
      howParentsCanHelp: body.howParentsCanHelp ?? null, createdAt: nowIso,
    };
    d.termReports.push(report);
    (body.marks ?? []).forEach((mk: { subjectId: string; score: number; grade?: string; comment?: string }) => {
      d.marks.push({
        id: nextId("mark"), termReportId: report.id, subjectId: mk.subjectId,
        score: mk.score, grade: mk.grade ?? null, comment: mk.comment ?? null,
      });
    });
    return { report: reportFull(d, report) };
  }
  if (seg[0] === "reports" && seg[2] === "file" && m === "POST") {
    const r = d.termReports.find((x) => x.id === seg1);
    if (!r) return fail(404, "Report not found");
    r.fileUrl = photo("Report PDF", 10);
    return { report: reportFull(d, r) };
  }
  if (seg[0] === "reports" && seg[2] === "share" && m === "POST") {
    need();
    const r = d.termReports.find((x) => x.id === seg1);
    if (!r) return fail(404, "Report not found");
    const st = d.students.find((s) => s.id === r.studentId);
    const count = notifyGuardians(d, r.studentId, {
      type: "REPORT_SHARED",
      title: `${r.term} ${r.year} report for ${st?.firstName ?? "your child"} is ready`,
      body: "Your class teacher has shared a term report with you.",
      data: { studentId: r.studentId, reportId: r.id },
    });
    return { shared: count };
  }

  // ---------------- progress ----------------
  if (path === "/progress" && m === "GET") {
    const u = need();
    if (u.role === Role.PARENT) assertOwns(d, u.id, sid);
    const list = d.progress
      .filter((p) => p.studentId === q.studentId)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map((p) => progressFull(d, p));
    return { reports: list };
  }
  if (path === "/progress" && m === "POST") {
    const p: MockProgress = {
      id: nextId("prog"), studentId: body.studentId, teacherId: need().id, term: body.term,
      strengths: body.strengths, talents: body.talents, needs: body.needs,
      howParentsCanHelp: body.howParentsCanHelp, createdAt: nowIso,
    };
    d.progress.push(p);
    return { report: progressFull(d, p) };
  }
  if (seg[0] === "progress" && seg[2] === "share" && m === "POST") {
    need();
    const p = d.progress.find((x) => x.id === seg1);
    if (!p) return fail(404, "Progress update not found");
    const st = d.students.find((s) => s.id === p.studentId);
    const count = notifyGuardians(d, p.studentId, {
      type: "PROGRESS_SHARED",
      title: `New progress & talent update for ${st?.firstName ?? "your child"}`,
      body: p.talents || "Your class teacher has shared a progress update with you.",
      data: { studentId: p.studentId, progressId: p.id },
    });
    return { shared: count };
  }

  // ---------------- invoices ----------------
  if (path === "/invoices" && m === "GET") {
    const u = need();
    if (u.role === Role.PARENT) {
      if (!q.studentId) fail(400, "studentId is required");
      assertOwns(d, u.id, sid);
    }
    const list = d.invoices
      .filter((inv) => (q.studentId ? inv.studentId === q.studentId : true))
      .sort((a, b) => (a.dueDate < b.dueDate ? 1 : -1))
      .map((inv) => invoiceFull(d, inv));
    return { invoices: list };
  }
  if (path === "/invoices" && m === "POST") {
    const inv: MockInvoice = {
      id: nextId("inv"), studentId: body.studentId, term: body.term,
      amount: body.amount, dueDate: new Date(body.dueDate).toISOString(),
      status: "UNPAID", createdAt: nowIso,
    };
    d.invoices.push(inv);
    return { invoice: invoiceFull(d, inv) };
  }
  if (path === "/invoices/payments" && m === "POST") {
    const inv = d.invoices.find((x) => x.id === body.invoiceId);
    if (!inv) return fail(404, "Invoice not found");
    const payment: MockPayment = {
      id: nextId("pay"), invoiceId: inv.id, amount: body.amount, method: body.method ?? null, createdAt: nowIso,
    };
    d.payments.push(payment);
    const paid = d.payments.filter((p) => p.invoiceId === inv.id).reduce((s, p) => s + p.amount, 0);
    inv.status = paid >= inv.amount ? "PAID" : paid > 0 ? "PARTIAL" : "UNPAID";
    return { payment, invoice: invoiceFull(d, inv) };
  }

  // ---------------- stats ----------------
  if (path === "/stats/overview" && m === "GET") {
    need();
    const todayIso = dateOnly(new Date()).toISOString();
    const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
    const todayDay = days[new Date().getUTCDay()];
    const todayAttendance = d.attendance.filter((a) => a.date === todayIso);
    const presentStudents = todayAttendance.filter((a) => a.status === "PRESENT" || a.status === "LATE").length;
    const absentStudents = todayAttendance.filter((a) => a.status === "ABSENT").length;
    const totalTeachers = d.users.filter((u) => u.role === Role.TEACHER).length;
    const scheduledTeacherIds = new Set(
      d.slots.filter((s) => s.day === todayDay && s.teacherId).map((s) => s.teacherId!),
    );
    const availableTeachers = scheduledTeacherIds.size;
    return {
      totalTeachers,
      availableTeachers,
      unavailableTeachers: Math.max(0, totalTeachers - availableTeachers),
      totalStudents: d.students.length,
      presentStudents,
      absentStudents,
      totalClasses: d.classes.length,
      pendingAlerts: d.alerts.filter((a) => a.status === "PENDING").length,
    };
  }

  // ---------------- messages ----------------
  if (path === "/messages/contacts" && m === "GET") {
    const u = need();
    const wanted =
      u.role === Role.PARENT ? [Role.TEACHER, Role.ADMIN]
        : u.role === Role.TEACHER ? [Role.PARENT, Role.ADMIN]
          : [Role.PARENT, Role.TEACHER, Role.ADMIN];
    const contacts = d.users
      .filter((x) => wanted.includes(x.role) && x.id !== u.id)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((x) => ({ id: x.id, name: x.name, role: x.role, avatarUrl: x.avatarUrl }));
    return { contacts };
  }
  if (path === "/messages/unread-count" && m === "GET") {
    const u = need();
    return { count: d.messages.filter((mm) => mm.receiverId === u.id && !mm.readAt).length };
  }
  if (path === "/messages" && m === "GET") {
    const u = need();
    const list = d.messages
      .filter((mm) =>
        (mm.senderId === u.id && mm.receiverId === q.withUserId) ||
        (mm.senderId === q.withUserId && mm.receiverId === u.id),
      )
      .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
      .slice(0, 200);
    d.messages.forEach((mm) => {
      if (mm.senderId === q.withUserId && mm.receiverId === u.id && !mm.readAt) mm.readAt = nowIso;
    });
    return { messages: list };
  }
  if (path === "/messages" && m === "POST") {
    const u = need();
    const message: MockMessage = {
      id: nextId("msg"), senderId: u.id, receiverId: body.receiverId, body: body.body,
      createdAt: nowIso, readAt: null,
    };
    d.messages.push(message);
    return { message };
  }

  // ---------------- users ----------------
  if (path === "/users" && m === "GET") {
    need();
    const list = d.users
      .filter((u) => (q.role ? u.role === q.role : true))
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .map(pub);
    return { users: list };
  }
  if (path === "/users" && m === "POST") {
    const u: MockUser = {
      id: nextId("u"), email: body.email, username: body.username || null, name: body.name,
      role: body.role, phone: body.phone ?? null, avatarUrl: null, createdAt: nowIso,
    };
    d.users.push(u);
    d.passwords[u.id] = body.password;
    return { user: pub(u) };
  }
  if (seg[0] === "users" && seg[2] === "avatar" && m === "POST") {
    const u = d.users.find((x) => x.id === seg1);
    if (!u) return fail(404, "User not found");
    u.avatarUrl = photo(u.name, 260);
    return { user: pub(u) };
  }
  if (seg[0] === "users" && seg[1] && m === "GET") {
    const u = d.users.find((x) => x.id === seg1);
    if (!u) return fail(404, "User not found");
    return { user: pub(u) };
  }
  if (seg[0] === "users" && seg[1] && m === "PATCH") {
    const u = d.users.find((x) => x.id === seg1);
    if (!u) return fail(404, "User not found");
    if (body.name !== undefined) u.name = body.name;
    if (body.phone !== undefined) u.phone = body.phone;
    if (body.password) d.passwords[u.id] = body.password;
    return { user: pub(u) };
  }
  if (seg[0] === "users" && seg[1] && m === "DELETE") {
    d.users = d.users.filter((x) => x.id !== seg1);
    return null;
  }

  // ---------------- notifications ----------------
  if (path === "/notifications" && m === "GET") {
    const u = need();
    const list = d.notifications
      .filter((n) => n.userId === u.id)
      .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      .slice(0, 50);
    return { notifications: list, unread: list.filter((n) => !n.readAt).length };
  }
  if (path === "/notifications/read-all" && m === "POST") {
    const u = need();
    d.notifications.forEach((n) => { if (n.userId === u.id) n.readAt = nowIso; });
    return null;
  }
  if (seg[0] === "notifications" && seg[2] === "read" && m === "POST") {
    const u = need();
    const n = d.notifications.find((x) => x.id === seg1 && x.userId === u.id);
    if (n) n.readAt = nowIso;
    return null;
  }

  return fail(404, "Not found");
}
