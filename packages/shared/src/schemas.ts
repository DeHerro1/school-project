import { z } from "zod";
import {
  Role,
  ClassLevel,
  AttendanceStatus,
  Weekday,
  InvoiceStatus,
} from "./enums";

const roleEnum = z.enum([Role.ADMIN, Role.TEACHER, Role.PARENT]);
const classLevelEnum = z.enum([
  ClassLevel.NURSERY,
  ClassLevel.PRIMARY,
  ClassLevel.JUNIOR,
  ClassLevel.SENIOR,
]);
const attendanceStatusEnum = z.enum([
  AttendanceStatus.PRESENT,
  AttendanceStatus.ABSENT,
  AttendanceStatus.LATE,
]);
const weekdayEnum = z.enum([
  Weekday.MON,
  Weekday.TUE,
  Weekday.WED,
  Weekday.THU,
  Weekday.FRI,
]);

// ---------- Auth ----------
// Username rules for staff sign-in: letters, numbers, dot, underscore, hyphen.
export const usernameSchema = z
  .string()
  .min(3)
  .max(30)
  .regex(/^[a-zA-Z0-9._-]+$/, "Use letters, numbers, and . _ - only");

// A user may sign in with either their email or their username.
export const loginSchema = z
  .object({
    email: z.string().email().optional(),
    username: z.string().min(1).optional(),
    password: z.string().min(6),
  })
  .refine((d) => !!d.email || !!d.username, {
    message: "Email or username is required",
    path: ["username"],
  });
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(2),
  phone: z.string().min(6).optional(),
  role: roleEnum.default(Role.PARENT),
});
export type RegisterInput = z.infer<typeof registerSchema>;

// ---------- Users ----------
// Admins create accounts. Staff (teacher/admin) sign in with a username, so it
// is required for those roles; parents keep signing in with their email.
export const createUserSchema = registerSchema
  .extend({ username: usernameSchema.optional() })
  .refine((d) => d.role === Role.PARENT || !!d.username, {
    message: "Username is required for staff accounts",
    path: ["username"],
  });
export const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(6).optional(),
  password: z.string().min(6).optional(),
});

// ---------- Classes / Subjects / Timetable ----------
export const createClassSchema = z.object({
  name: z.string().min(1),
  level: classLevelEnum,
  homeroomTeacherId: z.string().uuid().optional(),
  studentCount: z.number().int().min(0).optional(),
  subjectsOffered: z.string().max(500).optional(),
});
export const updateClassSchema = createClassSchema.partial();

// Fields a staff (teacher) member is allowed to update on a class.
export const updateClassStaffSchema = z.object({
  studentCount: z.number().int().min(0).optional(),
  subjectsOffered: z.string().max(500).optional(),
});

export const createSubjectSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1).optional(),
  // Activities (Lunch, Worship, …) appear on the timetable without a teacher.
  isActivity: z.boolean().optional(),
});

const timeString = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Time must be in HH:MM format");

export const createTimetableSlotSchema = z.object({
  classId: z.string().cuid(),
  subjectId: z.string().cuid(),
  // Optional: activity slots (Lunch, Worship, …) have no teacher.
  teacherId: z.string().uuid().optional(),
  day: weekdayEnum,
  period: z.number().int().min(1).max(12),
  startTime: timeString,
  endTime: timeString,
  // Repeat the slot on every school day (Mon–Fri) for the term.
  repeat: z.boolean().optional(),
});

// Editing an existing slot: every field is optional, the class it belongs to is
// fixed, and `teacherId` may be nulled to turn a slot into a teacher-less activity.
export const updateTimetableSlotSchema = z.object({
  subjectId: z.string().cuid().optional(),
  teacherId: z.string().uuid().nullable().optional(),
  day: weekdayEnum.optional(),
  period: z.number().int().min(1).max(12).optional(),
  startTime: timeString.optional(),
  endTime: timeString.optional(),
});

// ---------- Students / Guardianship ----------
export const createStudentSchema = z.object({
  // Optional on input — the API generates one when it isn't supplied.
  admissionNo: z.string().min(1).optional(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  dob: z.coerce.date(),
  classId: z.string().cuid().optional(),
  isFirstTime: z.boolean().default(false),
  // Parent / guardian contact details
  guardianName: z.string().min(1).optional(),
  guardianPhone: z.string().min(1).optional(),
  secondaryGuardianName: z.string().min(1).optional(),
  secondaryGuardianPhone: z.string().min(1).optional(),
  address: z.string().min(1).optional(),
});
export const updateStudentSchema = createStudentSchema.partial();

export const linkGuardianSchema = z.object({
  parentUserId: z.string().uuid(),
  studentId: z.string().cuid(),
  relation: z.string().min(2).default("Parent"),
});

// ---------- Attendance / Alerts ----------
export const markAttendanceSchema = z.object({
  studentId: z.string().cuid(),
  date: z.coerce.date().optional(),
  status: attendanceStatusEnum,
});

export const bulkAttendanceSchema = z.object({
  classId: z.string().cuid(),
  date: z.coerce.date().optional(),
  entries: z
    .array(
      z.object({
        studentId: z.string().cuid(),
        status: attendanceStatusEnum,
      }),
    )
    .min(1),
});

// attendanceId comes from the URL (/attendance/:id/alert), so only the message
// is taken from the body.
export const raiseAlertSchema = z.object({
  message: z.string().min(1).default("Your child is not at school today."),
});

export const respondAlertSchema = z.object({
  parentReason: z.string().min(2),
});

// ---------- Media (photo share) ----------
export const createMediaShareSchema = z.object({
  studentId: z.string().cuid(),
  caption: z.string().max(500).optional(),
  // file provided via multipart/form-data (field: "file")
});

// ---------- Reports ----------
export const markSchema = z.object({
  subjectId: z.string().cuid(),
  score: z.number().min(0).max(100),
  grade: z.string().optional(),
  comment: z.string().optional(),
});

export const createTermReportSchema = z.object({
  studentId: z.string().cuid(),
  term: z.string().min(1),
  year: z.coerce.number().int(),
  marks: z.array(markSchema).optional(),
  // when a Third Term report is issued, the class the student is promoted to
  promotedToClassId: z.string().cuid().optional().nullable(),
  // date the school reopens; on/after it, promoted students are moved up
  reopenDate: z.coerce.date().optional().nullable(),
  // narrative sections written by the class teacher
  positionInClass: z.string().optional().nullable(),
  progress: z.string().optional().nullable(),
  interest: z.string().optional().nullable(),
  strength: z.string().optional().nullable(),
  howParentsCanHelp: z.string().optional().nullable(),
  // optional PDF via multipart (field: "file")
});

export const createProgressReportSchema = z.object({
  studentId: z.string().cuid(),
  term: z.string().min(1),
  strengths: z.string().min(1),
  talents: z.string().min(1),
  needs: z.string().min(1),
  howParentsCanHelp: z.string().min(1),
});

// ---------- Messaging ----------
export const sendMessageSchema = z.object({
  receiverId: z.string().uuid(),
  body: z.string().min(1).max(2000),
});

// ---------- Fees ----------
export const createInvoiceSchema = z.object({
  studentId: z.string().cuid(),
  term: z.string().min(1),
  amount: z.number().positive(),
  dueDate: z.coerce.date(),
});

export const recordPaymentSchema = z.object({
  invoiceId: z.string().cuid(),
  amount: z.number().positive(),
  method: z.string().min(1).default("cash"),
});

export const invoiceStatusValues = [
  InvoiceStatus.UNPAID,
  InvoiceStatus.PARTIAL,
  InvoiceStatus.PAID,
] as const;
