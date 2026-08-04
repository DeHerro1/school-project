import { PrismaClient, Prisma } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();
const PASSWORD = "password123";

function dateOnly(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}
function daysAgo(n: number) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return dateOnly(d);
}
/** The last `count` weekdays (Mon–Fri), most recent first. */
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

async function main() {
  console.log("Seeding database…");
  const passwordHash = await argon2.hash(PASSWORD);

  // Wipe (dev only) — order respects FKs.
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.progressReport.deleteMany();
  await prisma.mark.deleteMany();
  await prisma.termReport.deleteMany();
  await prisma.mediaShare.deleteMany();
  await prisma.absenceAlert.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.guardianship.deleteMany();
  await prisma.timetable.deleteMany();
  await prisma.message.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.student.deleteMany();
  await prisma.subject.deleteMany();
  await prisma.class.deleteMany();
  await prisma.user.deleteMany();

  // ---------------------------------------------------------------- Users ----
  const admin = await prisma.user.create({
    data: { email: "admin@school.test", username: "admin", passwordHash, name: "Ama Mensah (Head)", role: "ADMIN", phone: "0244000000" },
  });

  // Additional administrative staff (bursar, registrar, etc.).
  const adminSeed = [
    { email: "kofi.admin@school.test", username: "kofiadmin", name: "Kofi Annan (Assistant Head)", phone: "0244000001" },
    { email: "adwoa.admin@school.test", username: "adwoaadmin", name: "Adwoa Sarpong (Bursar)", phone: "0244000002" },
    { email: "nana.admin@school.test", username: "nanaadmin", name: "Nana Yeboah (Registrar)", phone: "0244000003" },
  ];
  const admins = [admin];
  for (const a of adminSeed) {
    admins.push(await prisma.user.create({ data: { ...a, passwordHash, role: "ADMIN" } }));
  }

  const teacherSeed = [
    { email: "sarah@school.test", username: "sarah", name: "Sarah Owusu", phone: "0201111111" },
    { email: "mike@school.test", username: "mike", name: "Michael Adjei", phone: "0202222222" },
    { email: "grace@school.test", username: "grace", name: "Grace Boateng", phone: "0203333333" },
    { email: "kwame@school.test", username: "kwame", name: "Kwame Asante", phone: "0204444444" },
    { email: "efua@school.test", username: "efua", name: "Efua Darko", phone: "0205555555" },
    { email: "yaw@school.test", username: "yaw", name: "Yaw Ofori", phone: "0206666666" },
    { email: "abena@school.test", username: "abena", name: "Abena Nyarko", phone: "0207777777" },
    { email: "kojo@school.test", username: "kojo", name: "Kojo Mensah", phone: "0208888888" },
    { email: "afia@school.test", username: "afia", name: "Afia Agyeman", phone: "0209000001" },
    { email: "kwabena@school.test", username: "kwabena", name: "Kwabena Osei", phone: "0209000002" },
    { email: "adjoa@school.test", username: "adjoa", name: "Adjoa Frimpong", phone: "0209000003" },
    { email: "fiifi@school.test", username: "fiifi", name: "Fiifi Quartey", phone: "0209000004" },
  ];
  const teachers = [];
  for (const t of teacherSeed) {
    teachers.push(
      await prisma.user.create({ data: { ...t, passwordHash, role: "TEACHER" } }),
    );
  }
  const teacher = teachers[0]; // Sarah — homeroom of the demo nursery class

  const parentSeed = [
    { email: "john@parent.test", name: "John Bello", phone: "0244333333" },
    { email: "mary@parent.test", name: "Mary Musa", phone: "0244444444" },
    { email: "peter@parent.test", name: "Peter Anane", phone: "0244555555" },
    { email: "linda@parent.test", name: "Linda Quaye", phone: "0244666666" },
    { email: "samuel@parent.test", name: "Samuel Tetteh", phone: "0244777777" },
    { email: "rita@parent.test", name: "Rita Addo", phone: "0244888888" },
    { email: "grace.p@parent.test", name: "Grace Ampofo", phone: "0244999001" },
    { email: "daniel@parent.test", name: "Daniel Ofori", phone: "0244999002" },
    { email: "comfort@parent.test", name: "Comfort Asare", phone: "0244999003" },
    { email: "emmanuel@parent.test", name: "Emmanuel Kena", phone: "0244999004" },
  ];
  const parents = [];
  for (const p of parentSeed) {
    parents.push(
      await prisma.user.create({ data: { ...p, passwordHash, role: "PARENT" } }),
    );
  }
  const [john, mary] = parents;

  // ------------------------------------------------------------- Subjects ----
  const subjectSeed = [
    { name: "Mathematics", code: "MATH" },
    { name: "English Language", code: "ENG" },
    { name: "Integrated Science", code: "SCI" },
    { name: "Social Studies", code: "SOC" },
    { name: "Creative Arts", code: "ART" },
    { name: "Religious & Moral Education", code: "RME" },
    { name: "ICT", code: "ICT" },
    { name: "Ghanaian Language", code: "GHL" },
    { name: "Physical Education", code: "PE" },
    { name: "Music", code: "MUS" },
  ];
  const subjects = [];
  for (const s of subjectSeed) {
    subjects.push(await prisma.subject.create({ data: s }));
  }
  const subjectNames = subjects.map((s) => s.name);

  // Non-teaching activities — appear on the timetable without a teacher.
  const lunch = await prisma.subject.create({ data: { name: "Lunch", isActivity: true } });
  const worship = await prisma.subject.create({ data: { name: "Worship", isActivity: true } });

  // -------------------------------------------------------------- Classes ----
  // Nursery → JHS 3, with level, homeroom teacher, roll count and subjects.
  type ClassDef = { name: string; level: "NURSERY" | "PRIMARY" | "JUNIOR"; subjects: string[] };
  const nurserySubjects = ["Mathematics", "English Language", "Creative Arts", "Music"];
  const primarySubjects = [
    "Mathematics", "English Language", "Integrated Science", "Social Studies",
    "Creative Arts", "Religious & Moral Education", "ICT", "Ghanaian Language",
  ];
  const jhsSubjects = subjectNames; // all subjects
  const classDefs: ClassDef[] = [
    { name: "Nursery", level: "NURSERY", subjects: nurserySubjects },
    { name: "KG 1", level: "NURSERY", subjects: nurserySubjects },
    { name: "KG 2", level: "NURSERY", subjects: nurserySubjects },
    { name: "Primary 1", level: "PRIMARY", subjects: primarySubjects },
    { name: "Primary 2", level: "PRIMARY", subjects: primarySubjects },
    { name: "Primary 3", level: "PRIMARY", subjects: primarySubjects },
    { name: "Primary 4", level: "PRIMARY", subjects: primarySubjects },
    { name: "Primary 5", level: "PRIMARY", subjects: primarySubjects },
    { name: "Primary 6", level: "PRIMARY", subjects: primarySubjects },
    { name: "JHS 1", level: "JUNIOR", subjects: jhsSubjects },
    { name: "JHS 2", level: "JUNIOR", subjects: jhsSubjects },
    { name: "JHS 3", level: "JUNIOR", subjects: jhsSubjects },
  ];
  const classes = [];
  for (let i = 0; i < classDefs.length; i++) {
    const def = classDefs[i];
    classes.push(
      await prisma.class.create({
        data: {
          name: def.name,
          level: def.level,
          homeroomTeacherId: teachers[i % teachers.length].id,
          studentCount: 20 + ((i * 3) % 18),
          subjectsOffered: def.subjects.join(", "),
        },
      }),
    );
  }
  const nursery = classes[0];

  // -------------------------------------------------------------- Students ----
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

  const students = [];
  let admNo = 1;
  for (let ci = 0; ci < classes.length; ci++) {
    const perClass = 3 + (ci % 3); // 3–5 students per class
    for (let k = 0; k < perClass; k++) {
      const fi = (ci * 5 + k) % firstNames.length;
      const li = (ci + k) % lastNames.length;
      const isNursery = classes[ci].level === "NURSERY";
      const parent = parents[(ci + k) % parents.length];
      const s = await prisma.student.create({
        data: {
          admissionNo: `STU-${String(admNo).padStart(3, "0")}`,
          firstName: firstNames[fi],
          lastName: lastNames[li],
          dob: new Date(2010 + ci, (k * 2) % 12, ((k + 1) * 3) % 28 || 1),
          isFirstTime: isNursery && k === 0,
          classId: classes[ci].id,
          guardianName: parent.name,
          guardianPhone: parent.phone,
          secondaryGuardianName: k % 2 === 0 ? "Grace Bello" : "Ibrahim Musa",
          secondaryGuardianPhone: k % 2 === 0 ? "0209990000" : "0209991111",
          address: addresses[(ci + k) % addresses.length],
        },
      });
      students.push({ student: s, parent, classIndex: ci });
      admNo++;
    }
  }

  // Force the README demo children into known parents/classes.
  const tunde = students[0].student; // first nursery student
  const ada = students[1].student;
  const zainab = students[2].student;
  await prisma.guardianship.createMany({
    data: [
      { parentUserId: john.id, studentId: tunde.id, relation: "Father" },
      { parentUserId: john.id, studentId: ada.id, relation: "Father" },
      { parentUserId: mary.id, studentId: zainab.id, relation: "Mother" },
    ],
    skipDuplicates: true,
  });
  // Link the rest to their assigned parent.
  for (let i = 3; i < students.length; i++) {
    await prisma.guardianship.create({
      data: {
        parentUserId: students[i].parent.id,
        studentId: students[i].student.id,
        relation: i % 2 ? "Mother" : "Father",
      },
    });
  }

  // ------------------------------------------------------------- Timetable ----
  const days: Array<"MON" | "TUE" | "WED" | "THU" | "FRI"> = ["MON", "TUE", "WED", "THU", "FRI"];
  // Each period maps to a clock time shown down the left of the timetable.
  const periodTimes: Record<number, [string, string]> = {
    1: ["08:00", "08:45"],
    2: ["08:45", "09:30"],
    3: ["09:45", "10:30"],
    4: ["10:30", "11:15"],
    5: ["11:30", "12:15"],
    6: ["12:15", "13:00"],
  };
  const timetableData: Prisma.TimetableCreateManyInput[] = [];
  for (let ci = 0; ci < classes.length; ci++) {
    for (let di = 0; di < days.length; di++) {
      for (let period = 1; period <= 4; period++) {
        const subject = subjects[(ci + di + period) % subjects.length];
        const t = teachers[(ci + period) % teachers.length];
        const [startTime, endTime] = periodTimes[period];
        timetableData.push({
          classId: classes[ci].id,
          subjectId: subject.id,
          teacherId: t.id,
          day: days[di],
          period,
          startTime,
          endTime,
        });
      }
      // Daily lunch (period 6) — a teacher-less activity slot.
      timetableData.push({
        classId: classes[ci].id,
        subjectId: lunch.id,
        teacherId: null,
        day: days[di],
        period: 6,
        startTime: periodTimes[6][0],
        endTime: periodTimes[6][1],
      });
    }
    // Monday worship assembly, before lessons.
    timetableData.push({
      classId: classes[ci].id,
      subjectId: worship.id,
      teacherId: null,
      day: "MON",
      period: 5,
      startTime: periodTimes[5][0],
      endTime: periodTimes[5][1],
    });
  }
  await prisma.timetable.createMany({ data: timetableData, skipDuplicates: true });

  // ------------------------------------------------------------ Attendance ----
  // Mark the last 15 school days for every student — mostly present, some
  // absent / late — so the dashboard's monthly figures are populated.
  const schoolDays = recentWeekdays(15);
  const attendanceData = [];
  for (let si = 0; si < students.length; si++) {
    const marker = teachers[si % teachers.length].id;
    // Only about a third of students are ever absent, so the monthly absentee
    // figure reads realistically rather than "everyone".
    const absenceProne = si % 3 === 0;
    for (let d = 0; d < schoolDays.length; d++) {
      const roll = (si * 7 + d * 3) % 10; // 0–9
      const status =
        absenceProne && roll === 0 ? "ABSENT" : roll === 1 ? "LATE" : "PRESENT";
      attendanceData.push({
        studentId: students[si].student.id,
        date: schoolDays[d],
        status: status as "PRESENT" | "ABSENT" | "LATE",
        markedById: marker,
      });
    }
  }
  await prisma.attendance.createMany({ data: attendanceData, skipDuplicates: true });

  // Ensure Zainab is absent today with a pending alert (README demo flow).
  const today = dateOnly(new Date());
  const zainabToday = await prisma.attendance.upsert({
    where: { studentId_date: { studentId: zainab.id, date: today } },
    create: { studentId: zainab.id, date: today, status: "ABSENT", markedById: teacher.id },
    update: { status: "ABSENT", markedById: teacher.id },
  });
  await prisma.absenceAlert.upsert({
    where: { attendanceId: zainabToday.id },
    create: {
      attendanceId: zainabToday.id,
      message: "Zainab is not at school today. Please let us know why.",
    },
    update: {},
  });

  // A responded alert on an earlier absence, for variety on the alerts page.
  const adaAbsence = await prisma.attendance.findFirst({
    where: { studentId: ada.id, status: "ABSENT" },
    orderBy: { date: "desc" },
  });
  if (adaAbsence) {
    await prisma.absenceAlert.upsert({
      where: { attendanceId: adaAbsence.id },
      create: {
        attendanceId: adaAbsence.id,
        message: "Ada was absent. Please let us know why.",
        parentReason: "She had a hospital appointment.",
        status: "RESPONDED",
        respondedAt: new Date(),
      },
      update: {},
    });
  }

  // ----------------------------------------------------------- Term reports ----
  for (let i = 0; i < Math.min(12, students.length); i++) {
    const s = students[i].student;
    await prisma.termReport.create({
      data: {
        studentId: s.id,
        term: "First Term",
        year: 2026,
        marks: {
          create: subjects.slice(0, 5).map((sub, j) => {
            const score = 55 + ((i * 7 + j * 11) % 40);
            return {
              subjectId: sub.id,
              score,
              grade: score >= 80 ? "A" : score >= 70 ? "B" : score >= 60 ? "C" : "D",
              comment: score >= 80 ? "Excellent" : score >= 65 ? "Good progress" : "Needs support",
            };
          }),
        },
      },
    });
  }

  // -------------------------------------------------------- Progress reports ----
  for (let i = 0; i < Math.min(8, students.length); i++) {
    const s = students[i].student;
    await prisma.progressReport.create({
      data: {
        studentId: s.id,
        teacherId: teachers[i % teachers.length].id,
        term: "First Term",
        strengths: "Strong focus during lessons and works well with peers.",
        talents: "Shows a clear talent for drawing and storytelling.",
        needs: "Encourage more reading practice at home.",
        howParentsCanHelp: "Read together for 15 minutes each evening and praise effort.",
      },
    });
  }

  // ---------------------------------------------------------------- Fees ----
  for (let i = 0; i < students.length; i++) {
    const s = students[i].student;
    const level = classes[students[i].classIndex].level;
    const amount = level === "JUNIOR" ? 90000 : level === "PRIMARY" ? 70000 : 50000;
    const mode = i % 3; // 0 paid, 1 partial, 2 unpaid
    const invoice = await prisma.invoice.create({
      data: {
        studentId: s.id,
        term: "First Term 2026",
        amount,
        dueDate: new Date("2026-09-30"),
        status: mode === 0 ? "PAID" : mode === 1 ? "PARTIAL" : "UNPAID",
      },
    });
    if (mode === 0) {
      await prisma.payment.create({ data: { invoiceId: invoice.id, amount, method: "bank" } });
    } else if (mode === 1) {
      await prisma.payment.create({
        data: { invoiceId: invoice.id, amount: Math.round(amount / 2), method: "momo" },
      });
    }
  }

  // ------------------------------------------------------------ Messages ----
  const messagePairs = [
    { from: john, to: admin, body: "Good morning, please what time is closing today?" },
    { from: admin, to: john, body: "Good morning! Closing is at 3:00pm today." },
    { from: mary, to: teacher, body: "Thank you for the update on Zainab." },
    { from: teacher, to: mary, body: "You're welcome. We'll keep you posted." },
    { from: parents[2], to: teachers[1], body: "Is there homework for the weekend?" },
  ];
  for (const m of messagePairs) {
    await prisma.message.create({
      data: { senderId: m.from.id, receiverId: m.to.id, body: m.body },
    });
  }

  // --------------------------------------------------------- Notifications ----
  await prisma.notification.createMany({
    data: [
      { userId: mary.id, type: "ABSENCE_ALERT", title: "Zainab is marked absent", body: "Please let us know why." },
      { userId: john.id, type: "REPORT", title: "New term report available", body: "Tunde's First Term report is ready." },
      { userId: john.id, type: "INVOICE", title: "New invoice", body: "First Term 2026 fees have been issued." },
    ],
  });

  console.log("Seed complete.");
  console.log(`  Classes: ${classes.length} (Nursery → JHS 3)`);
  console.log(`  Admins: ${admins.length}  Teachers: ${teachers.length}  Parents: ${parents.length}  Students: ${students.length}`);
  console.log("Demo logins (password: password123):");
  console.log("  ADMIN   username: admin  (admin@school.test)");
  console.log("  TEACHER username: sarah  (sarah@school.test)");
  console.log("  PARENT  john@parent.test  (children: Tunde, Ada)");
  console.log("  PARENT  mary@parent.test  (child: Zainab — has a pending absence alert)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
