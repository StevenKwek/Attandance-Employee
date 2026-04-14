/**
 * Reports Service — aggregates attendance data over a date range.
 * Runs exclusively in Route Handlers via the Firebase Admin SDK.
 */

import { type QuerySnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import { getAllUsers } from "@/lib/services/users.service";
import type {
  AttendanceDocument,
  AttendanceSummary,
  ReportResult,
  AttendanceStatus,
} from "@/lib/types";

const COLLECTION = "attendance";

// ─── Date Range Query ─────────────────────────────────────────────────────────

/**
 * Fetches all attendance records within [startDate, endDate] (inclusive).
 * Dates must be "YYYY-MM-DD" strings.
 * Optionally filters by userId.
 */
export async function getAttendanceByDateRange(
  startDate: string,
  endDate: string,
  userId?: string
): Promise<AttendanceDocument[]> {
  let query = adminDb
    .collection(COLLECTION)
    .where("date", ">=", startDate)
    .where("date", "<=", endDate)
    .orderBy("date", "asc");

  if (userId) {
    // Compound query: requires composite index on (userId, date)
    query = adminDb
      .collection(COLLECTION)
      .where("userId", "==", userId)
      .where("date", ">=", startDate)
      .where("date", "<=", endDate)
      .orderBy("date", "asc");
  }

  const snapshot: QuerySnapshot = await query.get();

  return snapshot.docs.map((doc) => {
    const d = doc.data();
    return {
      id: doc.id,
      userId: d.userId,
      date: d.date,
      checkIn: d.checkIn ?? null,
      checkOut: d.checkOut ?? null,
      status: d.status as AttendanceStatus,
    };
  });
}

// ─── Summary ──────────────────────────────────────────────────────────────────

/**
 * Computes a summary (present / late / absent) for a date range.
 *
 * "absent" = total expected check-ins (users × days) minus those with a Firestore record.
 * A missing record means the employee did not show up at all.
 */
export async function getAttendanceSummary(
  startDate: string,
  endDate: string,
  userId?: string
): Promise<ReportResult> {
  const records = await getAttendanceByDateRange(startDate, endDate, userId);

  const summary: AttendanceSummary = {
    totalPresent: 0,
    totalLate: 0,
    totalAbsent: 0,
  };

  for (const record of records) {
    if (record.status === "present") summary.totalPresent++;
    else if (record.status === "late") summary.totalLate++;
    else if (record.status === "absent") summary.totalAbsent++;
  }

  // Calculate absent days: days in range × employees − records with status != absent
  if (!userId) {
    const days = countWorkDays(startDate, endDate);
    const users = await getAllUsers();
    const totalExpected = users.length * days;
    const totalRecorded = records.length;
    summary.totalAbsent = Math.max(0, totalExpected - totalRecorded);
  } else {
    // For a single user, absent = days in range − recorded days
    const days = countWorkDays(startDate, endDate);
    summary.totalAbsent = Math.max(0, days - records.length);
  }

  return { records, summary };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Counts weekdays (Mon–Fri) between two "YYYY-MM-DD" date strings (inclusive).
 * Only counts days up to today so future days don't inflate "absent" counts.
 */
function countWorkDays(startDate: string, endDate: string): number {
  const todayStr = new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Jakarta" });
  const effectiveEnd = endDate > todayStr ? todayStr : endDate;

  let count = 0;
  const current = new Date(startDate + "T00:00:00");
  const end = new Date(effectiveEnd + "T00:00:00");

  while (current <= end) {
    const day = current.getDay();
    if (day !== 0 && day !== 6) count++; // skip Sunday (0) and Saturday (6)
    current.setDate(current.getDate() + 1);
  }
  return Math.max(1, count);
}
