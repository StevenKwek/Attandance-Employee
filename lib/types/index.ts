// ─── Roles ───────────────────────────────────────────────────────────────────

export type UserRole = "admin" | "employee";

// ─── Attendance Status ────────────────────────────────────────────────────────

export type AttendanceStatus = "present" | "late" | "absent";

/**
 * A minimal Timestamp shape compatible with both firebase/firestore
 * and firebase-admin/firestore — avoids coupling shared types to either SDK.
 */
export interface FirestoreTimestamp {
  toDate(): Date;
  toMillis(): number;
}

// ─── Firestore Document Types ─────────────────────────────────────────────────

export interface UserDocument {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
  phone?: string;
  joinDate?: string;     // "YYYY-MM-DD"
  status?: "aktif" | "nonaktif";
  createdAt: FirestoreTimestamp | null;
}

export interface AttendanceDocument {
  id: string;
  userId: string;
  date: string; // "YYYY-MM-DD"
  checkIn: FirestoreTimestamp | null;
  checkOut: FirestoreTimestamp | null;
  status: AttendanceStatus;
}

// ─── Request / Response Shapes ────────────────────────────────────────────────

export interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  role?: UserRole;
  department?: string;
  phone?: string;
  joinDate?: string;
  status?: "aktif" | "nonaktif";
}

/** Serialized attendance record — safe to send over the wire (no Firestore Timestamps) */
export interface SerializedAttendance {
  id: string;
  userId: string;
  date: string;
  checkIn: string | null;   // ISO datetime string
  checkOut: string | null;  // ISO datetime string
  status: AttendanceStatus;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UpdateUserPayload {
  name?: string;
  email?: string;
  role?: UserRole;
}

export interface CheckInPayload {
  userId: string;
}

export interface CheckOutPayload {
  userId: string;
}

// ─── Report Types ─────────────────────────────────────────────────────────────

export interface AttendanceSummary {
  totalPresent: number;
  totalLate: number;
  totalAbsent: number;
}

export interface ReportResult {
  records: AttendanceDocument[];
  summary: AttendanceSummary;
}

// ─── API Response ─────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ─── Middleware ───────────────────────────────────────────────────────────────

export interface AuthenticatedContext {
  uid: string;
  email: string;
  role: UserRole;
}
