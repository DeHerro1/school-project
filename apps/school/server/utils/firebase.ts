import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { applicationDefault, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth, type Auth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { MockFirestore } from "./mockFirestore";

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Firebase Admin SDK, initialised once per server process. Auth/Firestore/
 * Storage all bypass security rules through this SDK — every server/api/**
 * route is therefore the sole place that enforces role/ownership checks
 * (see requireUser() / access.ts), same responsibility the Express
 * `authGuard` + services/access.ts carried before.
 *
 * Auth talks to the local Auth Emulator when FIREBASE_AUTH_EMULATOR_HOST is
 * set (see .env.example) — that emulator is plain Node/JS, no JVM needed.
 * Firestore/Storage, by contrast, use a local, file-persisted, Node-only
 * stand-in (mockFirestore.ts / localStorage.ts) instead of the (Java-
 * requiring) Firestore/Storage emulators — see USE_REAL_FIREBASE below.
 * Set GOOGLE_APPLICATION_CREDENTIALS (a service-account JSON path) to point
 * every one of these at a real Firebase project instead.
 */
export const USE_REAL_FIREBASE = !!process.env.GOOGLE_APPLICATION_CREDENTIALS;

let app: App;

function getApp(): App {
  if (!app) {
    const config = useRuntimeConfig();
    const existing = getApps();
    app =
      existing[0] ??
      initializeApp({
        projectId: config.firebaseProjectId,
        storageBucket: config.firebaseStorageBucket,
        // Omitted entirely (not just `undefined`) when there's no real
        // project — firebase-admin rejects an explicit `credential: undefined`
        // key. No real credentials are needed to talk to the Auth emulator.
        ...(USE_REAL_FIREBASE ? { credential: applicationDefault() } : {}),
      });
  }
  return app;
}

export function adminAuth(): Auth {
  return getAuth(getApp());
}

let mockDb: MockFirestore | undefined;

export function adminDb(): Firestore {
  if (USE_REAL_FIREBASE) return getFirestore(getApp());
  // Shared with schools-backoffice's own mockFirestore fallback (same file,
  // resolved from repo root) — mirrors how both apps share one real Firestore
  // project in production (see schools-backoffice's platformAdmins collection).
  mockDb ??= new MockFirestore(resolve(__dirname, "../../../../.data/firestore.json"));
  return mockDb as unknown as Firestore;
}

export function adminBucket() {
  return getStorage(getApp()).bucket();
}

// ---------- Typed collection handles ----------
// Firestore is untyped by default; these narrow the common collections so
// route handlers get `.data()` shapes without repeating `as X` everywhere.

export interface UserDoc {
  email: string;
  username: string | null;
  name: string;
  role: "ADMIN" | "TEACHER" | "PARENT";
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

export interface ClassDoc {
  name: string;
  level: "NURSERY" | "PRIMARY" | "JUNIOR" | "SENIOR";
  homeroomTeacherId: string | null;
  studentCount: number | null;
  subjectsOffered: string | null;
  createdAt: string;
}

export interface SubjectDoc {
  name: string;
  code: string | null;
  isActivity: boolean;
}

export interface TimetableSlotDoc {
  classId: string;
  subjectId: string;
  teacherId: string | null;
  day: "MON" | "TUE" | "WED" | "THU" | "FRI";
  period: number;
  startTime: string | null;
  endTime: string | null;
}

export interface StudentDoc {
  admissionNo: string;
  firstName: string;
  lastName: string;
  dob: string;
  photoUrl: string | null;
  isFirstTime: boolean;
  classId: string | null;
  guardianName: string | null;
  guardianPhone: string | null;
  secondaryGuardianName: string | null;
  secondaryGuardianPhone: string | null;
  address: string | null;
  createdAt: string;
}

export interface GuardianshipDoc {
  parentUserId: string;
  studentId: string;
  relation: string;
}

export interface AttendanceDoc {
  studentId: string;
  date: string; // YYYY-MM-DD
  status: "PRESENT" | "ABSENT" | "LATE";
  markedById: string;
  createdAt: string;
}

export interface AbsenceAlertDoc {
  attendanceId: string;
  message: string;
  parentReason: string | null;
  status: "PENDING" | "RESPONDED";
  respondedAt: string | null;
  createdAt: string;
}

export interface NotificationDoc {
  userId: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
}

// ---------- Parent-facing surface (photos, reports, progress, fees, messages) ----------
// Ported from apps/api's Prisma models (MediaShare, TermReport, Mark,
// ProgressReport, Invoice, Payment, Message) — same field shapes, so the
// parent pages under app/pages/parent/** (moved over from the old, now
// retired, standalone parent portal) work against these unchanged.

export interface MediaDoc {
  studentId: string;
  teacherId: string;
  fileUrl: string;
  caption: string | null;
  createdAt: string;
}

export interface TermReportDoc {
  studentId: string;
  term: string;
  year: number;
  fileUrl: string | null;
  classId: string | null;
  promotedToClassId: string | null;
  reopenDate: string | null;
  promotionAppliedAt: string | null;
  positionInClass: string | null;
  progress: string | null;
  interest: string | null;
  strength: string | null;
  howParentsCanHelp: string | null;
  createdAt: string;
}

export interface MarkDoc {
  termReportId: string;
  subjectId: string;
  score: number;
  grade: string | null;
  comment: string | null;
}

export interface ProgressDoc {
  studentId: string;
  teacherId: string;
  term: string;
  strengths: string;
  talents: string;
  needs: string;
  howParentsCanHelp: string;
  createdAt: string;
}

export interface InvoiceDoc {
  studentId: string;
  term: string;
  amount: number;
  dueDate: string;
  status: "UNPAID" | "PARTIAL" | "PAID";
  createdAt: string;
}

export interface PaymentDoc {
  invoiceId: string;
  amount: number;
  method: string | null;
  createdAt: string;
}

export interface MessageDoc {
  senderId: string;
  receiverId: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export const collections = {
  users: () => adminDb().collection("users"),
  classes: () => adminDb().collection("classes"),
  subjects: () => adminDb().collection("subjects"),
  timetableSlots: () => adminDb().collection("timetableSlots"),
  students: () => adminDb().collection("students"),
  guardianships: () => adminDb().collection("guardianships"),
  attendance: () => adminDb().collection("attendance"),
  absenceAlerts: () => adminDb().collection("absenceAlerts"),
  notifications: () => adminDb().collection("notifications"),
  media: () => adminDb().collection("media"),
  termReports: () => adminDb().collection("termReports"),
  marks: () => adminDb().collection("marks"),
  progress: () => adminDb().collection("progress"),
  invoices: () => adminDb().collection("invoices"),
  payments: () => adminDb().collection("payments"),
  messages: () => adminDb().collection("messages"),
};
