// Shared domain enums — kept in sync with prisma/schema.prisma

export const Role = {
  ADMIN: "ADMIN",
  TEACHER: "TEACHER",
  PARENT: "PARENT",
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const ClassLevel = {
  NURSERY: "NURSERY",
  PRIMARY: "PRIMARY",
  JUNIOR: "JUNIOR",
  SENIOR: "SENIOR",
} as const;
export type ClassLevel = (typeof ClassLevel)[keyof typeof ClassLevel];

export const AttendanceStatus = {
  PRESENT: "PRESENT",
  ABSENT: "ABSENT",
  LATE: "LATE",
} as const;
export type AttendanceStatus = (typeof AttendanceStatus)[keyof typeof AttendanceStatus];

export const AlertStatus = {
  PENDING: "PENDING",
  RESPONDED: "RESPONDED",
} as const;
export type AlertStatus = (typeof AlertStatus)[keyof typeof AlertStatus];

export const InvoiceStatus = {
  UNPAID: "UNPAID",
  PARTIAL: "PARTIAL",
  PAID: "PAID",
} as const;
export type InvoiceStatus = (typeof InvoiceStatus)[keyof typeof InvoiceStatus];

export const Term = {
  FIRST: "First Term",
  SECOND: "Second Term",
  THIRD: "Third Term",
} as const;
export type Term = (typeof Term)[keyof typeof Term];

// Ready-made options for <Select> dropdowns
export const TERM_OPTIONS: { value: Term; label: string }[] = [
  { value: Term.FIRST, label: Term.FIRST },
  { value: Term.SECOND, label: Term.SECOND },
  { value: Term.THIRD, label: Term.THIRD },
];

// A built-in "subject" every school gets for free — it never needs to be
// created via Subjects management, always shows up when building a
// timetable, and (like any activity) needs neither a teacher nor a period.
export const LUNCH_SUBJECT_ID = "lunch";
export const LUNCH_SUBJECT = {
  id: LUNCH_SUBJECT_ID,
  name: "Lunch",
  code: null,
  isActivity: true,
} as const;

export const Weekday = {
  MON: "MON",
  TUE: "TUE",
  WED: "WED",
  THU: "THU",
  FRI: "FRI",
} as const;
export type Weekday = (typeof Weekday)[keyof typeof Weekday];

// A school registered through the schools-backoffice portal. SUSPENDED schools
// keep their data but their staff/parents can no longer sign in.
export const SchoolStatus = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;
export type SchoolStatus = (typeof SchoolStatus)[keyof typeof SchoolStatus];
