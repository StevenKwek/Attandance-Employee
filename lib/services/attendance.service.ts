/**
 * Attendance Service — server-side Firestore operations for the "attendance" collection.
 * Runs exclusively in Route Handlers via the Firebase Admin SDK.
 */

import {
  FieldValue,
  Timestamp,
  type DocumentSnapshot,
  type QuerySnapshot,
} from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase/admin";
import type { AttendanceDocument, AttendanceStatus, SerializedAttendance } from "@/lib/types";

const COLLECTION = "attendance";

// ─── Office hours (WIB / UTC+7) ───────────────────────────────────────────────
/** Earliest time employees can check in (07:00) */
const OFFICE_OPEN  = { hour: 7,  minute: 0  };
/** Latest time employees can check in (17:30) */
const OFFICE_CLOSE = { hour: 17, minute: 30 };
/** Cut-off hour (09:00) that separates "present" from "late" */
const LATE_HOUR = 9;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function snapshotToAttendance(snap: DocumentSnapshot): AttendanceDocument {
  const d = snap.data()!;
  return {
    id: snap.id,
    userId: d.userId,
    date: d.date,
    checkIn: d.checkIn ?? null,
    checkOut: d.checkOut ?? null,
    status: d.status as AttendanceStatus,
  };
}

/**
 * Returns today's date string in "YYYY-MM-DD" (WIB / UTC+7).
 */
function todayDate(): string {
  const now = new Date();
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 10);
}

/**
 * Returns current WIB time as { hour, minute }.
 */
function nowWIB(): { hour: number; minute: number } {
  const wib = new Date(Date.now() + 7 * 60 * 60 * 1000);
  return { hour: wib.getUTCHours(), minute: wib.getUTCMinutes() };
}

/**
 * Returns true if the current WIB time is within the check-in window.
 */
function isWithinOfficeHours(): boolean {
  const { hour, minute } = nowWIB();
  const current = hour * 60 + minute;
  const open    = OFFICE_OPEN.hour  * 60 + OFFICE_OPEN.minute;
  const close   = OFFICE_CLOSE.hour * 60 + OFFICE_CLOSE.minute;
  return current >= open && current <= close;
}

/**
 * Derives the attendance status from a check-in Timestamp.
 * Returns "late" if the hour (WIB) >= LATE_HOUR.
 */
function deriveStatus(checkInTs: Timestamp): AttendanceStatus {
  const date = checkInTs.toDate();
  const wib = new Date(date.getTime() + 7 * 60 * 60 * 1000);
  return wib.getUTCHours() >= LATE_HOUR ? "late" : "present";
}

// ─── Check-in ─────────────────────────────────────────────────────────────────

/**
 * Creates a new attendance record for today.
 * Throws if the user has already checked in today (1 check-in per day rule).
 */
export async function checkIn(userId: string): Promise<AttendanceDocument> {
  const date = todayDate();

  // Enforce office hours — reject check-in outside the allowed window
  if (!isWithinOfficeHours()) {
    const { hour, minute } = nowWIB();
    const current = hour * 60 + minute;
    const open    = OFFICE_OPEN.hour  * 60 + OFFICE_OPEN.minute;
    const close   = OFFICE_CLOSE.hour * 60 + OFFICE_CLOSE.minute;

    if (current < open) {
      throw new Error(
        `OFFICE_NOT_OPEN:Kantor belum buka. Check-in tersedia mulai pukul ${String(OFFICE_OPEN.hour).padStart(2,"0")}:${String(OFFICE_OPEN.minute).padStart(2,"0")} WIB.`
      );
    }
    throw new Error(
      `OFFICE_CLOSED:Kantor sudah tutup. Check-in hanya tersedia hingga pukul ${String(OFFICE_CLOSE.hour).padStart(2,"0")}:${String(OFFICE_CLOSE.minute).padStart(2,"0")} WIB.`
    );
  }

  // Enforce 1 check-in per day using a composite query
  const existing: QuerySnapshot = await adminDb
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .where("date", "==", date)
    .limit(1)
    .get();

  if (!existing.empty) {
    throw new Error(`User ${userId} has already checked in today (${date})`);
  }

  const checkInTs = Timestamp.now();
  const status = deriveStatus(checkInTs);

  const ref = adminDb.collection(COLLECTION).doc();
  const record: Omit<AttendanceDocument, "id"> = {
    userId,
    date,
    checkIn: checkInTs,
    checkOut: null,
    status,
  };

  await ref.set(record);

  return { id: ref.id, ...record };
}

// ─── Check-out ────────────────────────────────────────────────────────────────

/**
 * Updates the checkOut timestamp on today's attendance record.
 * Throws if no check-in exists for today or if already checked out.
 */
export async function checkOut(userId: string): Promise<AttendanceDocument> {
  const date = todayDate();

  const snapshot: QuerySnapshot = await adminDb
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .where("date", "==", date)
    .limit(1)
    .get();

  if (snapshot.empty) {
    throw new Error(
      `No check-in found for user ${userId} on ${date}. Check in first.`
    );
  }

  const docRef = snapshot.docs[0].ref;
  const data = snapshot.docs[0].data();

  if (data.checkOut !== null && data.checkOut !== undefined) {
    throw new Error(`User ${userId} has already checked out today (${date})`);
  }

  await docRef.update({ checkOut: FieldValue.serverTimestamp() });

  const updated = await docRef.get();
  return snapshotToAttendance(updated);
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Returns all attendance records for a given user, newest first.
 */
export async function getAttendanceByUser(
  userId: string
): Promise<AttendanceDocument[]> {
  const snapshot: QuerySnapshot = await adminDb
    .collection(COLLECTION)
    .where("userId", "==", userId)
    .orderBy("date", "desc")
    .get();

  return snapshot.docs.map(snapshotToAttendance);
}

/**
 * Returns all attendance records for a specific date (YYYY-MM-DD).
 */
export async function getAttendanceByDate(
  date: string
): Promise<AttendanceDocument[]> {
  const snapshot: QuerySnapshot = await adminDb
    .collection(COLLECTION)
    .where("date", "==", date)
    .orderBy("userId")
    .get();

  return snapshot.docs.map(snapshotToAttendance);
}

// ─── Serialization ────────────────────────────────────────────────────────────

/**
 * Converts an AttendanceDocument (with Firestore Timestamps) to a plain object
 * safe for JSON serialization over the wire.
 */
export function serializeAttendance(doc: AttendanceDocument): SerializedAttendance {
  return {
    id: doc.id,
    userId: doc.userId,
    date: doc.date,
    checkIn: doc.checkIn ? doc.checkIn.toDate().toISOString() : null,
    checkOut: doc.checkOut ? doc.checkOut.toDate().toISOString() : null,
    status: doc.status,
  };
}
